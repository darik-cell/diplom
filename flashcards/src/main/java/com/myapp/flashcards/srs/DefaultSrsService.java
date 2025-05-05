package com.myapp.flashcards.srs;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DefaultSrsService implements SrsService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;

  @Override
  public void initializeLearning(Card card) {
    // Перевод новой карточки в фазу Learning
    card.setType(1);   // 1 = learning
    card.setQueue(1);  // 1 = learn

    card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
    card.setDue((int) (Instant.now().getEpochSecond() +
            SrsConfig.LEARNING_STEPS_MIN[0] * 60));
  }


  @Override
  @Transactional
  public void processReview(Card card, ReviewAnswer quality) {

    /* -------------------------------------------------
       0. Общие данные
       ------------------------------------------------- */
    long nowSec = Instant.now().getEpochSecond();
    LocalDate createdDate = card.getCreatedAt().toLocalDate();
    int daysFromCreation = (int) ChronoUnit.DAYS.between(createdDate, LocalDate.now());

    /* -------------------------------------------------
       1. Learning / Relearning
       ------------------------------------------------- */
    if (card.getQueue() == 1 || card.getQueue() == 3) {

      // индекс текущего шага: 0 … (n‑1)
      int stepIdx = SrsConfig.LEARNING_STEPS_MIN.length - card.getStepsLeft();

      switch (quality) {

        /* ----- Again ― начать с нуля ----- */
        case AGAIN -> {
          card.setLapses(card.getLapses() + 1);
          card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
          card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[0] * 60));
        }

        /* ----- Hard ― повторить тот же шаг еще раз ----- */
        case HARD -> {
          // Anki: Hard = текущий шаг × HARD_FACTOR
          int delayMin = (int) Math.round(
                  SrsConfig.LEARNING_STEPS_MIN[stepIdx] * SrsConfig.HARD_FACTOR);
          card.setDue((int) (nowSec + delayMin * 60));
          // stepsLeft НЕ уменьшаем
        }

        /* ----- Good / Easy ----- */
        case GOOD, EASY -> {
          int remaining = card.getStepsLeft() - (quality == ReviewAnswer.GOOD ? 1 : card.getStepsLeft());

          /* 2.1 Ещё остались learning‑шаги */
          if (remaining > 0) {
            card.setStepsLeft(remaining);
            int nextIdx = SrsConfig.LEARNING_STEPS_MIN.length - remaining;
            card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[nextIdx] * 60));
          }
          /* 2.2 stepsLeft == 0  → выпуск в review */
          else {
            card.setStepsLeft(0);
            card.setType(2);                        // review
            card.setQueue(2);

            int gradIvl = (quality == ReviewAnswer.EASY)
                    ? SrsConfig.EASY_GRADUATING_IVL   // 4 дня
                    : 1;                              // Good → 1 день

            card.setIvl(gradIvl);
            card.setReps(card.getReps() + 1);
            card.setDue(daysFromCreation + gradIvl);
          }
        }
      }
      return;      // learning‑ветка завершена
    }

    /* -------------------------------------------------
       3. Review‑карты
       ------------------------------------------------- */
    if (card.getQueue() == 2) {

      /* 3.1 Повтор с ошибкой → Relearning */
      if (quality == ReviewAnswer.AGAIN) {
        card.setLapses(card.getLapses() + 1);
        card.setType(1);               // learning
        card.setQueue(3);              // relearn
        card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
        card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[0] * 60));
        return;
      }

      /* 3.2 Корректный ответ → новый интервал */
      int prevIvl = card.getIvl();
      int delay   = calculateDelay(card);
      int newIvl  = calculateNextInterval(prevIvl, quality, delay, card.getFactor());
      newIvl      = constrainInterval(newIvl);

      //‑‑‑ обновляем метрики
      card.setIvl(newIvl);
      card.setReps(card.getReps() + 1);

      switch (quality) {
        case HARD -> {
          int decreased = card.getFactor() - SrsConfig.HARD_FACTOR_DECREASE;
          card.setFactor(Math.max(decreased, SrsConfig.MIN_FACTOR));
        }
        case EASY -> {
          int increased = (int) (card.getFactor() * SrsConfig.EASY_BONUS);
          card.setFactor(increased);
        }
      }

      //‑‑‑ планируем следующий показ
      card.setDue(daysFromCreation + newIvl);
    }
  }

  /**
   * Возвращает все карточки из заданной коллекции, которым пора быть показанными.
   */
  @Override
  public List<Card> getDueCards(Integer collectionId, LocalDate today) {
    // 1. Находим коллекцию, чтобы взять её дату создания
    Collection coll = collectionRepository.findById(collectionId)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    LocalDate colCreatedDate = coll.getCreatedAt().toLocalDate();

    long nowSec = Instant.now().getEpochSecond();
    int daysSinceCreation = (int) ChronoUnit.DAYS.between(colCreatedDate, today);

    // 2. Берём все карты этой коллекции
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("id")).stream()
            .filter(c -> {
              switch (c.getQueue()) {
                case 0: // new
                  return true;
                case 1: // learning
                case 3: // relearn
                  // due — это UNIX-метка для intraday
                  return c.getDue() <= nowSec;
                case 2: // review
                  // due — это день от создания коллекции
                  return c.getDue() <= daysSinceCreation;
                default:
                  return false;
              }
            })
            .collect(Collectors.toList());
  }

  // --- вспомогательные методы ---

  /**
   * Сколько дней просрочено: текущий день – день, сохранённый в due.
   */
  private int calculateDelay(Card card) {
    LocalDate created = card.getCreatedAt().toLocalDate();
    int daysElapsed = (int) ChronoUnit.DAYS.between(created, LocalDate.now());
    return daysElapsed - card.getDue();
  }

  /**
   * Формула расчёта следующего интервала в днях (без ограничений):
   * HARD = prevIvl * hardFactor
   * GOOD = (prevIvl + delay/2) * ease
   * EASY = (prevIvl + delay) * ease * easyBonus
   */
  private int calculateNextInterval(int prevIvl,
                                    ReviewAnswer quality,
                                    int delay,
                                    int factorPermille) {
    double ease = factorPermille / 1000.0;
    switch (quality) {
      case HARD:
        return (int) (prevIvl * SrsConfig.HARD_FACTOR);
      case GOOD:
        return (int) ((prevIvl + delay / 2.0) * ease);
      case EASY:
        return (int) ((prevIvl + delay) * ease * SrsConfig.EASY_BONUS);
      default:
        throw new IllegalArgumentException("Unexpected quality: " + quality);
    }
  }

  /**
   * Приводим интервал к диапазону [MIN_INTERVAL; MAX_INTERVAL]
   */
  private int constrainInterval(int interval) {
    if (interval < SrsConfig.MIN_INTERVAL) {
      return SrsConfig.MIN_INTERVAL;
    }
    if (interval > SrsConfig.MAX_INTERVAL) {
      return SrsConfig.MAX_INTERVAL;
    }
    return interval;
  }

  /**
   * Предварительно рассчитывает интервалы для всех вариантов ответа.
   */
  public Map<ReviewAnswer, Integer> previewIntervals(Card card) {
    Map<ReviewAnswer, Integer> map = new EnumMap<>(ReviewAnswer.class);

    if (card.getQueue() == 0) {                       // новая карточка
      map.put(ReviewAnswer.AGAIN, SrsConfig.AGAIN_DELAY_SEC / 86_400);
      map.put(ReviewAnswer.HARD,  SrsConfig.HARD_DELAY_MIN / 1_440);
      map.put(ReviewAnswer.GOOD,  SrsConfig.GOOD_DELAY_MIN / 1_440);
      map.put(ReviewAnswer.EASY,  SrsConfig.EASY_GRADUATING_IVL);
      return map;
    }

    int prevIvl = card.getIvl();
    int delay = calculateDelay(card);

    map.put(ReviewAnswer.AGAIN, 0); // пересмотр в тот же день
    map.put(ReviewAnswer.HARD,  constrainInterval(
            (int) (prevIvl * SrsConfig.HARD_FACTOR)));
    map.put(ReviewAnswer.GOOD,  constrainInterval(
            (int) ((prevIvl + delay / 2.0) * card.getFactor() / 1000.0)));
    map.put(ReviewAnswer.EASY,  constrainInterval(
            (int) ((prevIvl + delay) * card.getFactor() / 1000.0 * SrsConfig.EASY_BONUS)));

    return map;
  }

  /**
   * Заполняет поле newIntervals у каждой карточки.
   */
  public void attachPreviewIntervals(List<Card> cards) {
    cards.forEach(c -> c.setNewIntervals(previewIntervals(c)));
  }
}

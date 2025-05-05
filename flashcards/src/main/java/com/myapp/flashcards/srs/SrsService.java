package com.myapp.flashcards.srs;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;

import java.time.LocalDate;
import java.util.List;

public interface SrsService {
  /**
   * Инициализирует SRS-поля при первом показе новой карточки.
   * Переводит её в очередь learning, выставляет due и stepsLeft.
   */
  void initializeLearning(Card card);

  /**
   * Обрабатывает нажатие кнопки оценки (Again/Hard/Good/Easy).
   * Пересчитывает ivl, factor, reps, lapses, due, queue, stepsLeft.
   */
  void processReview(Card card, ReviewAnswer quality);

  /**
   * Возвращает список карточек, которые сегодня надо показать:
   * – все новые (queue=new),
   * – все learning/relearning с due ≤ now,
   * – все review с dueDay ≤ today.
   */
  List<Card> getDueCards(Integer collectionId, LocalDate today);
}


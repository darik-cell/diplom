package com.myapp.flashcards.service;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.srs.DefaultSrsService;
import com.myapp.flashcards.srs.SrsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardReviewService {

  private final SrsService srsService;
  private final CardService cardService;
  private final CardRepository cardRepository;

  /**
   * Возвращает карточки, готовые к показу,
   * предварительно переводя новые (queue=0) в learning.
   */
  public List<Card> startLearning(Integer collectionId) {

    List<Card> due = srsService.getDueCards(collectionId, LocalDate.now());

    // 1. Новые → learning + немедленно сохраняем
    for (Card card : due) {
      if (card.getQueue() == 0) {
        srsService.initializeLearning(card);
        cardRepository.save(card);           // flush в БД, чтобы queue = 1
      }
    }

    // 2. Рассчитываем интервалы после перевода
    ((DefaultSrsService) srsService).attachPreviewIntervals(due);

    // 3. Сортировка: сначала те, что были new (теперь queue=1), потом по createdAt
    return due.stream()
            .sorted(Comparator
                    .comparing(Card::getQueue)          // 1 → первых
                    .thenComparing(Card::getCreatedAt))
            .toList();
  }

  public Card gradeCard(Integer cardId, ReviewAnswer answer) {
    Card card = cardService.getCardById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found"));
    srsService.processReview(card, answer);
    return card;
  }
}

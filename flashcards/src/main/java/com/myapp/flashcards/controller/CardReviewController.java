package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.NextInterval;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.service.CardReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class CardReviewController {

  private final CardReviewService reviewService;

  @QueryMapping
  public List<Card> startLearning(@Argument Integer collectionId) {
    return reviewService.startLearning(collectionId);
  }

  @MutationMapping
  public Card reviewCard(@Argument Integer cardId,
                         @Argument ReviewAnswer answer) {
    return reviewService.gradeCard(cardId, answer);
  }

  /**
   * Маппинг GraphQL поля Card.newIntervals → DTO NextInterval
   */
  @SchemaMapping(typeName = "Card", field = "newIntervals")
  public List<NextInterval> newIntervals(Card c) {
    return c.getNewIntervals().values().stream()
            .map(dto -> new NextInterval(dto.answer(), dto.interval(), dto.unit()))
            .toList();
  }
}

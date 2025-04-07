package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.Set;

@Controller
@RequiredArgsConstructor
public class CardController {

  private final CardService cardService;

  @MutationMapping
  public Card saveCard(@Argument("card") CardInp cardInp) {
    return cardService.saveCard(cardInp);
  }

  @QueryMapping
  public Set<Card> cardsByCollectionId(@Argument Integer collectionId) {
    return cardService.getAllByCollectionId(collectionId);
  }

  @QueryMapping
  public Card card(@Argument Integer id) {
    return cardService.getCardById(id)
            .orElseThrow(() -> new RuntimeException("Card not found"));
  }
}

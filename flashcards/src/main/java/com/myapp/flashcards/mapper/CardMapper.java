package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.Card;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring")
public interface CardMapper {

  Card toEntity(CardInp cardInp);
  CardInp toCardInp(Card card);

  Set<Card> toCardSet(Set<CardInp> cardInpSet);
  Set<CardInp> toCardInpSet(Set<Card> cardSet);
}

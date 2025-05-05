package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.mapper.CardMapper;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CardService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;
  private final CardMapper cardMapper;

  public Card saveCard(CardInp cardInp) {
    Card newCard = cardMapper.toEntity(cardInp);
    if (newCard.getId() != null) {
      Card existedCard = cardRepository.findById(newCard.getId())
              .orElseThrow(() -> new RuntimeException("Card not found"));
      if (!existedCard.getText().equals(newCard.getText())) existedCard.setText(newCard.getText());
      return cardRepository.save(existedCard);
    }
    newCard.setCollection(collectionRepository.findById(newCard.getCollection().getId())
            .orElseThrow(() -> new RuntimeException("Collection not found")));
    return cardRepository.save(newCard);
  }

  public Optional<Card> getCardById(int id) {
    return cardRepository.findById(id);
  }

  public Set<Card> getAllByCollectionId(Integer collectionId) {
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("createdAt"));
  }

  public Integer countByCollectionId(Integer collectionId) {
    return cardRepository.countByCollectionId(collectionId);
  }
}

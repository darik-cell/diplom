package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.mapper.CardMapper;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CardService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;
  private final CardMapper cardMapper;

  public Card saveCard(CardInp cardInp) {
    Card card = cardMapper.toEntity(cardInp);
    if (card.getId() != null) {
      // обновление текстового поля, как было
      Card exist = cardRepository.findById(card.getId())
              .orElseThrow(() -> new RuntimeException("Card not found"));
      if (!exist.getText().equals(card.getText())) {
        exist.setText(card.getText());
      }
      return cardRepository.save(exist);
    }
    // создание новой карты
    Collection coll = collectionRepository.findById(cardInp.getCollectionId())
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    card.setCollection(coll);

    // инициализация SRS-параметров по умолчанию (как в Anki)
    card.setType(0);
    card.setQueue(0);
    card.setDue(0);
    card.setIvl(0);
    card.setFactor(2500);
    card.setReps(0);
    card.setLapses(0);
    card.setStepsLeft(2);  // количество learning-шагов по умолчанию

    return cardRepository.save(card);
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

  public int countNew(Integer collId) {
      return cardRepository.countByCollectionIdAndQueue(collId, 0);
  }

  public int countLearning(Integer collId) {
      return cardRepository.countLearning(collId);
  }

  public int countDueReview(Integer collId) {
      Collection coll = collectionRepository.findById(collId)
               .orElseThrow(() -> new RuntimeException("Collection not found"));
      int today = (int) ChronoUnit.DAYS.between(
              coll.getCreatedAt().toLocalDate(), LocalDate.now());
      return cardRepository.countDueReview(collId, today);
  }
}

package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Card;

import java.util.List;
import java.util.Set;

public interface CardRepository extends JpaRepository<Card, Integer> {
  Set<Card> findAllByCollectionId(Integer collectionId);

  Integer countByCollectionId(Integer collectionId);
}

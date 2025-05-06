package com.myapp.flashcards.repository;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Card;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface CardRepository extends JpaRepository<Card, Integer> {
  Set<Card> findAllByCollectionId(Integer collectionId, Sort sort);

  Integer countByCollectionId(Integer collectionId);


  /* новые (queue = 0) */
  int countByCollectionIdAndQueue(Integer collectionId, int queue);

  /* learning  (queue = 1)  + relearn (queue = 3) */
  @Query("SELECT COUNT(c) FROM Card c WHERE c.collection.id = :cid AND c.queue IN (1,3)")
  int countLearning(@Param("cid") Integer collectionId);

  /* review‑карты, у которых dueDay ≤ :today */
  @Query("""
          SELECT COUNT(c) FROM Card c
          WHERE c.collection.id = :cid
            AND c.queue = 2
            AND c.due <= :today
          """)
  int countDueReview(@Param("cid") Integer collectionId,
                     @Param("today") int todayInDays);
}

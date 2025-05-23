package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.*;
import com.myapp.flashcards.service.CardService;
import com.myapp.flashcards.service.CollectionService;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Parent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequiredArgsConstructor
public class CollectionController {

  private final CollectionService collectionService;
  private final CardService cardService;

  @MutationMapping
  public Collection saveCollection(@Argument("collection") CollectionInp collectionInp) {
    Collection saved = collectionService.saveCollection(collectionInp);
    return saved;
  }

  @MutationMapping
  public Boolean deleteCollection(@Argument("id") Integer id) {
    return collectionService.deleteCollectionById(id);
  }

  @QueryMapping
  public Collection collection(@Argument Integer id) {
    return collectionService.getCollectionById(id)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
  }

  @QueryMapping
  public Set<Collection> collectionsByUserId(@Argument Integer userId) {
    return collectionService.getCollectionsByUserId(userId);
  }

  @SchemaMapping
  public Integer countCards(Collection collection) {
    return cardService.countByCollectionId(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "newCount")
  public Integer newCount(Collection collection) {
    return cardService.countNew(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "learningCount")
  public Integer learningCount(Collection collection) {
    return cardService.countLearning(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "reviewCount")
  public Integer reviewCount(Collection collection) {
    return cardService.countDueReview(collection.getId());
  }
}

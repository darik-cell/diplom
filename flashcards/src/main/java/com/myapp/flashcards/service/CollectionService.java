package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.mapper.CollectionMapper;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CollectionService {

  private final CollectionRepository collectionRepository;
  private final CollectionMapper collectionMapper;
  private final UserService userService;

  public Collection saveCollection(CollectionInp collectionInp) {
    Collection collection = collectionMapper.toEntity(collectionInp);
    if (collection.getId() != null) {
      Collection existingCollection = collectionRepository.findById(collection.getId())
                      .orElseThrow(() -> new RuntimeException("Collection not found"));
      if (collection.getCards() != null) existingCollection.setCards(collection.getCards());
      if (collection.getName() != null) existingCollection.setName(collection.getName());
      return collectionRepository.save(existingCollection);
    }
    else {
      if (collection.getUser() != null) collection.setUser(userService.getById(collection.getUser().getId())
              .orElseThrow(() -> new RuntimeException("User not found")));
      return collectionRepository.save(collection);
    }
  }

  public Set<Collection> getCollectionsByUserId(Integer userId) {
    return collectionRepository.findAllByUserId(userId);
  }

  public Optional<Collection> getCollectionById(Integer collectionId) {
    return collectionRepository.findById(collectionId);
  }

  public Boolean deleteCollectionById(Integer collectionId) {
    collectionRepository.deleteById(collectionId);
    return !collectionRepository.existsById(collectionId);
  }

}

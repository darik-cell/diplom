package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Collection;

import java.util.Optional;
import java.util.List;
import java.util.Set;

public interface CollectionRepository extends JpaRepository<Collection, Integer> {
  Set<Collection> findAllByUserId(Integer userId);
}

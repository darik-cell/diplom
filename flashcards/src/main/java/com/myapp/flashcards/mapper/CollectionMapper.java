package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.Collection;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring", uses = {CardMapper.class})
public interface CollectionMapper {

  Collection toEntity(CollectionInp collectionInp);
  CollectionInp toCollectionInp(Collection collection);

  Set<Collection> toCollectionSet(Set<CollectionInp> collectionInpSet);
  Set<CollectionInp> toCollectionInpSet(Set<Collection> collectionSet);
}

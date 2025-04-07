package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {CollectionMapper.class})
public interface UserMapper {

  @Mapping(target = "collections", source = "collections")
  User toEntity(UserInp userInp);

  UserInp fromRegisterRequest(RegisterRequest registerRequest);

  @Mapping(target = "collections", source = "collections")
  UserInp toUserInp(User user);
}

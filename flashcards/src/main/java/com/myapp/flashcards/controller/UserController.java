package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @MutationMapping
  public User saveUser(@Argument("user") UserInp userInp) {
    return userService.save(userInp);
  }

  @QueryMapping
  public User user(@Argument Integer id) {
    return userService.getById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
  }
}

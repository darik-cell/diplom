package com.myapp.flashcards.dto;

import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserInp {
  private Integer id;
  private String email;
  private String password;
  private Set<CollectionInp> collections;
}

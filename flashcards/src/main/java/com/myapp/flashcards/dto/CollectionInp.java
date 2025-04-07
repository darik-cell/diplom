package com.myapp.flashcards.dto;


import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CollectionInp {
  private Integer id;
  private UserInp user;
  private String name;
  private Set<CardInp> cards;
}

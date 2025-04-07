package com.myapp.flashcards.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CardInp {
  private Integer id;
  private String text;
  private CollectionInp collection;
  private LocalDateTime createdAt;
}

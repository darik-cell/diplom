package com.myapp.flashcards.dto;

import com.myapp.flashcards.model.IntervalUnit;
import com.myapp.flashcards.model.ReviewAnswer;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NextInterval {
  private ReviewAnswer answer;
  private Integer interval;
  private IntervalUnit intervalUnit;
}

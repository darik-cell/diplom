package com.myapp.flashcards.dto;

import com.myapp.flashcards.model.IntervalUnit;
import com.myapp.flashcards.model.ReviewAnswer;

public record NextIntervalDto(ReviewAnswer answer, int interval, IntervalUnit unit) {}
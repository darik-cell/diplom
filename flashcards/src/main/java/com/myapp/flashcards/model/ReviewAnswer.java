package com.myapp.flashcards.model;

public enum ReviewAnswer {
  AGAIN,   // lapse → перевод в relearning
  HARD,    // prevIvl * hardFactor
  GOOD,    // (prevIvl + delay/2) * ease
  EASY     // (prevIvl + delay) * ease * easyBonus
}

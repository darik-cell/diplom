package com.myapp.flashcards.srs;

public class SrsConfig {
  public static final double HARD_FACTOR = 1.2;
  public static final double EASY_BONUS = 1.3;
  public static final int MIN_INTERVAL = 1;    // день
  public static final int MAX_INTERVAL = 365;  // дней
  public static final int INITIAL_FACTOR = 2500; // promille = 2.5
  public static final int INITIAL_STEPS = 2;    // default learning steps
  public static final int MIN_FACTOR = 1300;  // минимум для ease-фактора
  public static final int HARD_FACTOR_DECREASE = 150;   // насколько понижаем (в промилле)
  public static final int AGAIN_DELAY_SEC = 0; // сразу
  public static final int HARD_DELAY_MIN = 600; // 10 минут
  public static final int GOOD_DELAY_MIN = 600; // 10 минут
  public static final int EASY_GRADUATING_IVL = 4; // 4 дня, как в Anki
  public static final int[] LEARNING_STEPS_MIN = {1, 10}; // пример: 1 мин и 10 мин
}

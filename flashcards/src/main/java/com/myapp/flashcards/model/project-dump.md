### Card.java
```java
package com.myapp.flashcards.model;

import com.myapp.flashcards.dto.NextIntervalDto;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Card {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Integer id;

  @Column(nullable = false, length = 5000)
  @EqualsAndHashCode.Include
  private String text;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "collection_id", nullable = false)
  private Collection collection;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  @EqualsAndHashCode.Include
  private LocalDateTime createdAt;

  // --- SRS-поля ---
  @Column(nullable = false)
  private Integer type;

  @Column(nullable = false)
  private Integer queue;

  @Column(nullable = false)
  private Integer due;

  @Column(nullable = false)
  private Integer ivl;

  @Column(nullable = false)
  private Integer factor;

  @Column(nullable = false)
  private Integer reps;

  @Column(nullable = false)
  private Integer lapses;

  @Column(name = "steps_left", nullable = false)
  private Integer stepsLeft;

  @Transient
  private Map<ReviewAnswer, NextIntervalDto> newIntervals = new EnumMap<>(ReviewAnswer.class);

  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) {
      collection.getCards().add(this);
    }
  }
}
```

### Collection.java
```java
package com.myapp.flashcards.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "collections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Collection {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Integer id;

  @Column(nullable = false)
  @EqualsAndHashCode.Include
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @OneToMany(mappedBy = "collection", fetch = FetchType.LAZY, cascade = { CascadeType.REMOVE }, orphanRemoval = true)
  private Set<Card> cards = new HashSet<>();

  @CreationTimestamp
  @Column(name = "created_at", updatable = false, nullable = false)
  private LocalDateTime createdAt;

  public void setCards(Set<Card> cards) {
    if (cards == null) this.cards = null;
    else {
      this.cards.clear();
      cards.forEach(c -> c.setCollection(this));
    }
  }
}
```

### IntervalUnit.java
```java
package com.myapp.flashcards.model;

public enum IntervalUnit { MIN, DAY }
```

### ReviewAnswer.java
```java
package com.myapp.flashcards.model;

public enum ReviewAnswer {
  AGAIN,   // lapse → перевод в relearning
  HARD,    // prevIvl * hardFactor
  GOOD,    // (prevIvl + delay/2) * ease
  EASY     // (prevIvl + delay) * ease * easyBonus
}
```

### User.java
```java
package com.myapp.flashcards.model;

import jakarta.persistence.*;
        import lombok.*;
import org.aspectj.weaver.patterns.TypePatternQuestions;

import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(unique = true, nullable = false)
  private String email;

  @Column(nullable = false)
  private String password;

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
  private Set<Collection> collections;
}
```


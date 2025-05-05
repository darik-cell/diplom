package com.myapp.flashcards.model;

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
  private Map<ReviewAnswer, Integer> newIntervals = new EnumMap<>(ReviewAnswer.class);

  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) {
      collection.getCards().add(this);
    }
  }
}

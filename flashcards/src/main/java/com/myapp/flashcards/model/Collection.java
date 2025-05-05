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

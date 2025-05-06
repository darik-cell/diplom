- Найди репозиторий anki, найди в нем алгоритм интервального повторения, напиши его реализацию в этом чате и
  высокоуровнево объясни как он работает

- Как устроены сущности в anki? Интересует то, что относится к алгоритму интервального повторения. Для каждой карточки в
  бд записывается информация о каждом повторении? Или это сделано как-то иначе?

&&&

# Моя java сущность

```java

@Entity
@Table(name = "cards")
@Data
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

  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) collection.getCards().add(this);
  }
}
```

# Часть полей из таблицы в anki

```sql
CREATE TABLE cards
(
    id     INTEGER PRIMARY KEY,
    type   INTEGER NOT NULL, -- тип: 0=new,1=learning,2=due,3=filtered
    queue  INTEGER NOT NULL, -- очередь: -1=suspended,0=new,1=learn,2=review,3=relearn
    due    INTEGER NOT NULL, -- для review: день, для new/learn: отметка
    ivl    INTEGER NOT NULL, -- текущий интервал SRS (в днях)
    factor INTEGER NOT NULL, -- ease-фактор (1000 → 1.0, 2500 → 2.5 и т.д.)
    reps   INTEGER NOT NULL, -- всего успешных повторений
    lapses INTEGER NOT NULL, -- число «провалов» (возврат в learning)
    left   INTEGER NOT NULL,
);
```

- Давай дополним сущность необходимыми полями для возможности изучения по схожей схеме как в anki
- добавь поля из sql скрипта в мою entity


&&&

```java

package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.Set;

@Controller
@RequiredArgsConstructor
public class CardController {

  private final CardService cardService;

  @MutationMapping
  public Card saveCard(@Argument("card") CardInp cardInp) {
    return cardService.saveCard(cardInp);
  }

  @QueryMapping
  public Set<Card> cardsByCollectionId(@Argument Integer collectionId) {
    return cardService.getAllByCollectionId(collectionId);
  }

  @QueryMapping
  public Card card(@Argument Integer id) {
    return cardService.getCardById(id)
            .orElseThrow(() -> new RuntimeException("Card not found"));
  }
}
```

```java

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
```

```java

package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.Card;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring")
public interface CardMapper {

  Card toEntity(CardInp cardInp);
  CardInp toCardInp(Card card);

  Set<Card> toCardSet(Set<CardInp> cardInpSet);
  Set<CardInp> toCardInpSet(Set<Card> cardSet);
}
```

```java

package com.myapp.flashcards.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "cards")
@Data
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

  // --- Новые поля для SRS ---

  /** 0=new, 1=learning, 2=due, 3=filtered */
  @Column(nullable = false)
  private Integer type;

  /** -1=suspended,0=new,1=learn,2=review,3=relearn */
  @Column(nullable = false)
  private Integer queue;

  /**
   * Для review: день (число дней от создания коллекции),
   * для new/learn: UNIX-timestamp следующего шага
   */
  @Column(nullable = false)
  private Integer due;

  /** Текущий интервал SRS (в днях) */
  @Column(nullable = false)
  private Integer ivl;

  /** Ease-фактор (1000 → 1.0, 2500 → 2.5 и т.д.) */
  @Column(nullable = false)
  private Integer factor;

  /** Всего успешных повторений (Good/Easy) */
  @Column(nullable = false)
  private Integer reps;

  /** Число «провалов» (возврат в learning) */
  @Column(nullable = false)
  private Integer lapses;

  /**
   * Кодированное число шагов обучения:
   * старшие разряды (÷1000) = сколько шагов можно успеть сегодня,
   * младшие (mod 1000) = сколько шагов всего.
   */
  @Column(name = "`left`", nullable = false)
  private Integer left;

  // Сеттер для двунаправленной связи
  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) {
      collection.getCards().add(this);
    }
  }
}
```

```java

package com.myapp.flashcards.repository;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Card;

import java.util.List;
import java.util.Set;

public interface CardRepository extends JpaRepository<Card, Integer> {
  Set<Card> findAllByCollectionId(Integer collectionId, Sort sort);

  Integer countByCollectionId(Integer collectionId);
}
```

```java

package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.mapper.CardMapper;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CardService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;
  private final CardMapper cardMapper;

  public Card saveCard(CardInp cardInp) {
    Card newCard = cardMapper.toEntity(cardInp);
    if (newCard.getId() != null) {
      Card existedCard = cardRepository.findById(newCard.getId())
              .orElseThrow(() -> new RuntimeException("Card not found"));
      if (!existedCard.getText().equals(newCard.getText())) existedCard.setText(newCard.getText());
      return cardRepository.save(existedCard);
    }
    newCard.setCollection(collectionRepository.findById(newCard.getCollection().getId())
            .orElseThrow(() -> new RuntimeException("Collection not found")));
    return cardRepository.save(newCard);
  }

  public Optional<Card> getCardById(int id) {
    return cardRepository.findById(id);
  }

  public Set<Card> getAllByCollectionId(Integer collectionId) {
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("createdAt"));
  }

  public Integer countByCollectionId(Integer collectionId) {
    return cardRepository.countByCollectionId(collectionId);
  }
}
```

```sql

-- Таблица карточек
CREATE TABLE cards (
                     id SERIAL PRIMARY KEY,
                     text TEXT NOT NULL,
                     collection_id BIGINT NOT NULL,
                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     CONSTRAINT fk_cards_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
```

```graphql

scalar LocalDateTime

extend type Query {
  card(id: ID!): Card
  cardsByCollectionId(collectionId: ID!): [Card]
}

extend type Mutation {
  saveCard(card: CardInp!): Card
  deleteCard(card: CardInp!): Boolean
  deleteCardsByCollectionId(collectionId: ID!): Int
}

input CardInp {
  id: ID
  text: String
  collection: CollectionInp
  createdAt: LocalDateTime
}

type Card {
    id: ID!
    text: String!
    collection: Collection!
    createdAt: LocalDateTime
    reviewHistory: [ReviewHistory]
}
```

- Исправь sql скрипт
- Исправь создание карточки
- Исправь graphqls тип
- Исправь input если надо 
- Пока что не надо возможность настраивать параметры, задай все default как в anki


&&&

- При создании карточки мы все установили в ноли. Но мне кажется надо 
  - При создании инициализировать не нолями, а сразу использовать логику SRS и задавать начальные значения
  - Или нет?
  - Пока не пиши код, просто ответь на вопрос

&&&

- У меня spring boot приложение на java, мне надо добавить в него алгоритм интервального повторения
- Я хочу упрощенную версию алгоритма anki без fuzzling и пока что без возможности настройки параметров под коллекцию, но может быть добавлю это в будущем
- Давай определимся какие методы надо написать и какая будет структура у всей этой логики

&&&
Здесь надо получать id коллекции и возвращать карточки для коллекции а не просто все. Можно добавить в коллекцию поле createdAt

```java

package com.myapp.flashcards.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "collections")
@Data
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

  public void setCards(Set<Card> cards) {
    if (cards == null) this.cards = null;
    else {
      this.cards.clear();
      cards.forEach(c -> c.setCollection(this));
    }
  }
}
```

# Markdown редактор
**Производная** - ??предел?? отношения ??приращения?? функции к ??приращению?? аргумента:
$$
f'(x) = ??\lim_{\Delta x \to 0}?? \frac{??\Delta?? f(x)}{??\Delta?? x}
$$

&&&
- Если карточка новая то перед тем как показать ее отправь запрос на initialize learning, а в process review не надо делать initialize learning, чтобы новые интервалы были пересчитаны после initialize learning

&&&
- Добавь на `Main.jsx` в таблице отображение количества новых карточек, карточек, которые изучаются, и карточки которые для повторения
- Так же сделай, чтобы при каждом переходе значения в таблице обновлялись, они как будто кэшируются и у меня не всегда отображается корректно количество карточек

&&&
- Сделай чтобы контейнер div#root был растянут до красного квадрата
- чтобы внизу под кнопками как на втором изображении выводилось количество карточек при повторении

&&&
- При этом в проекте есть класс `public class SensitiveDataMasker implements ValueMasker` 
- Для чего он нужен? Если в проекте уже есть класс расширяющий `PatternLayout`

&&&
- Напиши диаграмму на plantUML которая пояснит как работает схема с ValueMasker
- Приведи пример кода, который пояснит, что происходит
- Вот что я понял:
  - Формируется лог через log.info(), т.е. создается ILoggingEvent
  - Что дальше происходит? Почему он может быть обработан PatternLayout или ValueMasker, в каких случаях он преобразуется в json а когда просто как строка
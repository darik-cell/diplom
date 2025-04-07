### card.graphqls
```
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

### collection.graphqls
```
extend type Query {
    collection(id: ID!): Collection
    collectionsByUserId(userId: ID!): [Collection]
}

extend type Mutation {
    saveCollection(collection: CollectionInp!): Collection
}

input CollectionInp {
    id: ID
    name: String
    user: UserInp
    cards: [CardInp]
}

type Collection {
    id: ID!
    name: String!
    user: User
    cards: [Card]
    countCards: Int
}
```

### reviewhistory.graphqls
```
type ReviewHistory {
    id: ID!
    card: Card
    reviewDate: LocalDateTime
    quality: Int
    repetitionCount: Int
    intervalDays: Int
    easeFactor: Float
    nextReview: LocalDateTime
}
```

### user.graphqls
```
type Query {
    user(id: ID!): User!
    users: [User]
}

type Mutation {
    saveUser(user: UserInp!): User
}

type User {
    id: ID!
    email: String!
    password: String
    collections: [Collection]
}

input UserInp {
    id: ID
    email: String
    password: String
    collections: [CollectionInp]
}
```


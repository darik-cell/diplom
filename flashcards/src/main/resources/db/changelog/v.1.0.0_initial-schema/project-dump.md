### 01-changeset-users-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="1" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="01-create-users-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="01-drop-users-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### 01-create-users-table.sql
```sql
-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 01-drop-users-table.sql
```sql
DROP TABLE users;
```

### 10-changeset-collections-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="2" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="10-create-collections-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="10-drop-collections-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### 10-create-collections-table.sql
```sql
-- Таблица коллекций
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 10-drop-collections-table.sql
```sql
DROP TABLE collections;
```

### 20-changeset-cards-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="3" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="20-create-cards-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="20-drop-cards-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### 20-create-cards-table.sql
```sql
CREATE TABLE cards
(
    id            SERIAL PRIMARY KEY,
    text          TEXT      NOT NULL,
    collection_id BIGINT    NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- поля SRS с дефолтами, как в Anki
    type          INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    queue         INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    due           INTEGER   NOT NULL DEFAULT 0,    -- для new = 0
    ivl           INTEGER   NOT NULL DEFAULT 0,    -- в днях
    factor        INTEGER   NOT NULL DEFAULT 2500, -- ease-factor = 2.5
    reps          INTEGER   NOT NULL DEFAULT 0,
    lapses        INTEGER   NOT NULL DEFAULT 0,
    steps_left    INTEGER   NOT NULL DEFAULT 2     -- default learning steps = 2
);
```

### 20-drop-cards-table.sql
```sql
DROP TABLE cards;
```

### 30-changeset-repetitions-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="4" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="30-create-repetitions-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
    </changeSet>

</databaseChangeLog>
```

### 30-create-repetitions-table.sql
```sql
CREATE TABLE repetitions
(

);
```

### db.changelog-v.1.0.0_initial-schema.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <include file="01-changeset-users-table.xml" relativeToChangelogFile="true"/>
    <include file="10-changeset-collections-table.xml" relativeToChangelogFile="true"/>
    <include file="20-changeset-cards-table.xml" relativeToChangelogFile="true"/>

</databaseChangeLog>
```


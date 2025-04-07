package com.myapp.flashcards.config;

import com.myapp.flashcards.graphql.scalars.CustomLocalDateTimeCoercing;
import graphql.language.StringValue;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Configuration
public class GraphQLConfig {

  @Bean
  public GraphQLScalarType localDateTimeScalar() {
    return GraphQLScalarType.newScalar()
            .name("LocalDateTime")
            .description("Кастомный скаляр для LocalDateTime с форматом HH:mm dd.MM.yyyy")
            .coercing(new CustomLocalDateTimeCoercing())
            .build();
  }

  @Bean
  public RuntimeWiringConfigurer runtimeWiringConfigurer() {
    return builder -> builder.scalar(localDateTimeScalar());
  }
}

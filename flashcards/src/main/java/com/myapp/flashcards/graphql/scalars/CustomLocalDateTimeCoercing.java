package com.myapp.flashcards.graphql.scalars;

import graphql.GraphQLContext;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.execution.CoercedVariables;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import jakarta.validation.constraints.NotNull;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class CustomLocalDateTimeCoercing implements Coercing<LocalDateTime, String> {

  private static final DateTimeFormatter CUSTOM_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd.MM.yyyy");

  @Override
  public @Nullable String serialize(@NotNull Object dataFetcherResult,
                                    @NotNull GraphQLContext graphQLContext,
                                    @NotNull Locale locale) throws CoercingSerializeException {
    if (dataFetcherResult instanceof LocalDateTime) {
      return ((LocalDateTime) dataFetcherResult).format(CUSTOM_FORMATTER);
    }
    throw new CoercingSerializeException("Ожидался объект LocalDateTime.");
  }

  @Override
  public @Nullable LocalDateTime parseValue(@NotNull Object input,
                                            @NotNull GraphQLContext graphQLContext,
                                            @NotNull Locale locale) throws CoercingParseValueException {
    try {
      return LocalDateTime.parse(input.toString(), CUSTOM_FORMATTER);
    } catch (Exception e) {
      throw new CoercingParseValueException("Неверное значение LocalDateTime: " + input, e);
    }
  }

  @Override
  public @Nullable LocalDateTime parseLiteral(@NotNull Value<?> input,
                                              @NotNull CoercedVariables variables,
                                              @NotNull GraphQLContext graphQLContext,
                                              @NotNull Locale locale) throws CoercingParseLiteralException {
    if (input instanceof StringValue) {
      try {
        return LocalDateTime.parse(((StringValue) input).getValue(), CUSTOM_FORMATTER);
      } catch (Exception e) {
        throw new CoercingParseLiteralException("Неверное значение LocalDateTime.", e);
      }
    }
    throw new CoercingParseLiteralException("Ожидался тип StringValue.");
  }

  @Override
  public @NotNull Value<?> valueToLiteral(@NotNull Object input,
                                          @NotNull GraphQLContext graphQLContext,
                                          @NotNull Locale locale) {
    return StringValue.newStringValue(input.toString()).build();
  }
}

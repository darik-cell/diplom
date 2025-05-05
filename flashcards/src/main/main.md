### java\com\myapp\flashcards\config\GraphQLConfig.java
```java
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
```

### java\com\myapp\flashcards\config\SecurityConfig.java
```java
package com.myapp.flashcards.config;

import com.myapp.flashcards.security.JwtAuthenticationFilter;
import com.myapp.flashcards.security.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.*;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Autowired
  private JwtAuthenticationFilter jwtAuthenticationFilter;

  @Autowired
  private CustomUserDetailsService userDetailsService;

  @Bean
  public AuthenticationManager authenticationManager(
          AuthenticationConfiguration authenticationConfiguration) throws Exception {
    return authenticationConfiguration.getAuthenticationManager();
  }

  @Bean
  public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(request -> {
          CorsConfiguration config = new CorsConfiguration();
          config.setAllowedOriginPatterns(Arrays.asList("*"));
          config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
          config.setAllowedHeaders(Arrays.asList("*"));
          config.setAllowCredentials(true);
          return config;
        }))
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/graphiql").permitAll()
                .anyRequest().permitAll()
        )
        .authenticationProvider(authenticationProvider())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();

    authProvider.setUserDetailsService(userDetailsService);
    authProvider.setPasswordEncoder(passwordEncoder());

    return authProvider;
  }
}
```

### java\com\myapp\flashcards\controller\AuthController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.AuthRequest;
import com.myapp.flashcards.dto.AuthResponse;
import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.mapper.UserMapper;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import com.myapp.flashcards.security.JwtUtil;
import com.myapp.flashcards.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.*;
        import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthenticationManager authenticationManager;
  private final UserService userService;
  private final JwtUtil jwtUtil;

  @PostMapping("/register")
  public String register(@RequestBody RegisterRequest request) {
    if(userService.existsByEmail(request.getEmail())) {
      return "Email is already taken!";
    }
    userService.save(request);
    return "User registered successfully!";
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody AuthRequest request) {
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
    );
    User user = userService.getByEmail(request.getEmail())
            .orElseThrow(() -> new UsernameNotFoundException("User not found!"));
    String token = jwtUtil.generateJwtToken(user);
    return new AuthResponse(token);
  }
}
```

### java\com\myapp\flashcards\controller\CardController.java
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

### java\com\myapp\flashcards\controller\CardReviewController.java
```java
package com.myapp.flashcards.controller;

public class CardReviewController {
}
```

### java\com\myapp\flashcards\controller\CollectionController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.*;
import com.myapp.flashcards.service.CardService;
import com.myapp.flashcards.service.CollectionService;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Parent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequiredArgsConstructor
public class CollectionController {

  private final CollectionService collectionService;
  private final CardService cardService;

  @MutationMapping
  public Collection saveCollection(@Argument("collection") CollectionInp collectionInp) {
    Collection saved = collectionService.saveCollection(collectionInp);
    return saved;
  }

  @MutationMapping
  public Boolean deleteCollection(@Argument("id") Integer id) {
    return collectionService.deleteCollectionById(id);
  }

  @QueryMapping
  public Collection collection(@Argument Integer id) {
    return collectionService.getCollectionById(id)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
  }

  @QueryMapping
  public Set<Collection> collectionsByUserId(@Argument Integer userId) {
    return collectionService.getCollectionsByUserId(userId);
  }

  @SchemaMapping
  public Integer countCards(Collection collection) {
    return cardService.countByCollectionId(collection.getId());
  }
}
```

### java\com\myapp\flashcards\controller\UserController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @MutationMapping
  public User saveUser(@Argument("user") UserInp userInp) {
    return userService.save(userInp);
  }

  @QueryMapping
  public User user(@Argument Integer id) {
    return userService.getById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
  }
}
```

### java\com\myapp\flashcards\dto\AuthRequest.java
```java
package com.myapp.flashcards.dto;

import lombok.Data;

@Data
public class AuthRequest {
  private String email;
  private String password;
}
```

### java\com\myapp\flashcards\dto\AuthResponse.java
```java
package com.myapp.flashcards.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
  private String token;
}
```

### java\com\myapp\flashcards\dto\CardInp.java
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
  private Integer collectionId;
}
```

### java\com\myapp\flashcards\dto\CollectionInp.java
```java
package com.myapp.flashcards.dto;


import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CollectionInp {
  private Integer id;
  private UserInp user;
  private String name;
  private Set<CardInp> cards;
}
```

### java\com\myapp\flashcards\dto\RegisterRequest.java
```java
package com.myapp.flashcards.dto;

import lombok.*;
import org.springframework.stereotype.Service;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
  private String email;
  private String password;
}
```

### java\com\myapp\flashcards\dto\UserInp.java
```java
package com.myapp.flashcards.dto;

import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserInp {
  private Integer id;
  private String email;
  private String password;
  private Set<CollectionInp> collections;
}
```

### java\com\myapp\flashcards\FlashcardsApplication.java
```java
package com.myapp.flashcards;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FlashcardsApplication {

  public static void main(String[] args) {
    SpringApplication.run(FlashcardsApplication.class, args);
  }

}
```

### java\com\myapp\flashcards\graphql\scalars\CustomLocalDateTimeCoercing.java
```java
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
```

### java\com\myapp\flashcards\mapper\CardMapper.java
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

### java\com\myapp\flashcards\mapper\CollectionMapper.java
```java
package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.Collection;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring", uses = {CardMapper.class})
public interface CollectionMapper {

  Collection toEntity(CollectionInp collectionInp);
  CollectionInp toCollectionInp(Collection collection);

  Set<Collection> toCollectionSet(Set<CollectionInp> collectionInpSet);
  Set<CollectionInp> toCollectionInpSet(Set<Collection> collectionSet);
}
```

### java\com\myapp\flashcards\mapper\UserMapper.java
```java
package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {CollectionMapper.class})
public interface UserMapper {

  @Mapping(target = "collections", source = "collections")
  User toEntity(UserInp userInp);

  UserInp fromRegisterRequest(RegisterRequest registerRequest);

  @Mapping(target = "collections", source = "collections")
  UserInp toUserInp(User user);
}
```

### java\com\myapp\flashcards\model\Card.java
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

  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) {
      collection.getCards().add(this);
    }
  }
}
```

### java\com\myapp\flashcards\model\Collection.java
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

### java\com\myapp\flashcards\model\ReviewAnswer.java
```java
package com.myapp.flashcards.model;

public enum ReviewAnswer {
  AGAIN,   // lapse → перевод в relearning
  HARD,    // prevIvl * hardFactor
  GOOD,    // (prevIvl + delay/2) * ease
  EASY     // (prevIvl + delay) * ease * easyBonus
}
```

### java\com\myapp\flashcards\model\User.java
```java
package com.myapp.flashcards.model;

import jakarta.persistence.*;
        import lombok.*;
import org.aspectj.weaver.patterns.TypePatternQuestions;

import java.util.Set;

@Entity
@Table(name = "users")
@Data
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

### java\com\myapp\flashcards\repository\CardRepository.java
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

### java\com\myapp\flashcards\repository\CardReviewHistoryRepository.java
```java
package com.myapp.flashcards.repository;

public interface CardReviewHistoryRepository {
}
```

### java\com\myapp\flashcards\repository\CollectionRepository.java
```java
package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Collection;

import java.util.Optional;
import java.util.List;
import java.util.Set;

public interface CollectionRepository extends JpaRepository<Collection, Integer> {
  Set<Collection> findAllByUserId(Integer userId);
}
```

### java\com\myapp\flashcards\repository\UserRepository.java
```java
package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
  Optional<User> findByEmail(String email);
  Boolean existsByEmail(String email);
}
```

### java\com\myapp\flashcards\security\CustomUserDetails.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

@Getter
public class CustomUserDetails implements UserDetails {

  private final User user;

  public CustomUserDetails(User user) {
    this.user = user;
  }


  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return null;
  }

  @Override
  public String getPassword() {
    return user.getPassword();
  }

  @Override
  public String getUsername() {
    return user.getEmail();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }

}
```

### java\com\myapp\flashcards\security\CustomUserDetailsService.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.*;
        import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User Not Found with email: " + email));

    return new CustomUserDetails(user);
  }
}
```

### java\com\myapp\flashcards\security\JwtAuthenticationFilter.java
```java
package com.myapp.flashcards.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.myapp.flashcards.model.User;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;
  private final UserDetailsService customUserDetailsService;

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    String jwt = parseJwt(request);
    if (jwt != null && jwtUtil.validateJwtToken(jwt)) {
      String email = jwtUtil.getEmailFromJwtToken(jwt);

      UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
      UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
              userDetails, null, null);
      authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

      SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    filterChain.doFilter(request, response);
  }

  private String parseJwt(HttpServletRequest request) {
    String headerAuth = request.getHeader("Authorization");
    if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
      return headerAuth.substring(7);
    }
    return null;
  }
}
```

### java\com\myapp\flashcards\security\JwtUtil.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

  private final SecretKey jwtSecret;
  private final long jwtExpirationMs;

  public JwtUtil(@Value("${jwt.secret}") String secret, @Value("${jwt.expirationMs}") long expirationMs) {
    this.jwtSecret = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
    this.jwtExpirationMs = expirationMs;
  }

  public String generateJwtToken(User user) {
    return Jwts.builder()
            .setSubject(user.getEmail())
            .claim("id", user.getId())  // добавляем userId в claims
            .setIssuedAt(new Date())
            .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
            .signWith(jwtSecret, SignatureAlgorithm.HS512)
            .compact();
  }

  public String getEmailFromJwtToken(String token) {
    return Jwts.parserBuilder()
            .setSigningKey(jwtSecret)
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
  }

  public boolean validateJwtToken(String authToken) {
    try {
      Jwts.parserBuilder()
              .setSigningKey(jwtSecret)
              .build()
              .parseClaimsJws(authToken);
      return true;
    } catch (JwtException e) {
      System.out.println("Ошибка при валидации JWT токена: " + e.getMessage());
    }
    return false;
  }
}
```

### java\com\myapp\flashcards\service\CardReviewService.java
```java
package com.myapp.flashcards.service;

public class CardReviewService {
}
```

### java\com\myapp\flashcards\service\CardService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.mapper.CardMapper;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
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
    Card card = cardMapper.toEntity(cardInp);
    if (card.getId() != null) {
      // обновление текстового поля, как было
      Card exist = cardRepository.findById(card.getId())
              .orElseThrow(() -> new RuntimeException("Card not found"));
      if (!exist.getText().equals(card.getText())) {
        exist.setText(card.getText());
      }
      return cardRepository.save(exist);
    }
    // создание новой карты
    Collection coll = collectionRepository.findById(cardInp.getCollectionId())
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    card.setCollection(coll);

    // инициализация SRS-параметров по умолчанию (как в Anki)
    card.setType(0);
    card.setQueue(0);
    card.setDue(0);
    card.setIvl(0);
    card.setFactor(2500);
    card.setReps(0);
    card.setLapses(0);
    card.setStepsLeft(2);  // количество learning-шагов по умолчанию

    return cardRepository.save(card);
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

### java\com\myapp\flashcards\service\CollectionService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.mapper.CollectionMapper;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CollectionService {

  private final CollectionRepository collectionRepository;
  private final CollectionMapper collectionMapper;
  private final UserService userService;

  public Collection saveCollection(CollectionInp collectionInp) {
    Collection collection = collectionMapper.toEntity(collectionInp);
    if (collection.getId() != null) {
      Collection existingCollection = collectionRepository.findById(collection.getId())
                      .orElseThrow(() -> new RuntimeException("Collection not found"));
      if (collection.getCards() != null) existingCollection.setCards(collection.getCards());
      if (collection.getName() != null) existingCollection.setName(collection.getName());
      return collectionRepository.save(existingCollection);
    }
    else {
      if (collection.getUser() != null) collection.setUser(userService.getById(collection.getUser().getId())
              .orElseThrow(() -> new RuntimeException("User not found")));
      return collectionRepository.save(collection);
    }
  }

  public Set<Collection> getCollectionsByUserId(Integer userId) {
    return collectionRepository.findAllByUserId(userId);
  }

  public Optional<Collection> getCollectionById(Integer collectionId) {
    return collectionRepository.findById(collectionId);
  }

  public Boolean deleteCollectionById(Integer collectionId) {
    collectionRepository.deleteById(collectionId);
    return !collectionRepository.existsById(collectionId);
  }

}
```

### java\com\myapp\flashcards\service\UserService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.mapper.UserMapper;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;

  public User save(UserInp userInp) {
    User user = userMapper.toEntity(userInp);
    if (user.getPassword() != null) {
      user.setPassword(passwordEncoder.encode(user.getPassword()));
    }
    user.setCollections(null);

    return userRepository.save(user);
  }

  public User save(RegisterRequest registerRequest) {
    UserInp user = userMapper.fromRegisterRequest(registerRequest);
    return save(user);
  }

  public boolean existsByEmail(String email) {
    return userRepository.existsByEmail(email);
  }

  public Optional<User> getById(Integer id) {
    return userRepository.findById(id);
  }

  public Optional<User> getByEmail(String email) {
    return userRepository.findByEmail(email);
  }
}
```

### java\com\myapp\flashcards\srs\DefaultSrsService.java
```java
package com.myapp.flashcards.srs;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DefaultSrsService implements SrsService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;

  @Override
  public void initializeLearning(Card card) {
    // Перевод новой карточки в фазу Learning
    card.setType(1);   // 1 = learning
    card.setQueue(1);  // 1 = learn
    card.setStepsLeft(SrsConfig.INITIAL_STEPS);
    // первый шаг сразу же доступен
    card.setDue((int) Instant.now().getEpochSecond());
  }

  @Override
  public void processReview(Card card, ReviewAnswer quality) {
    // 1) Если Again — начало переобучения
    if (quality == ReviewAnswer.AGAIN) {
      card.setLapses(card.getLapses() + 1);
      card.setType(1);    // возвращаем в learning
      card.setQueue(3);   // 3 = relearn
      card.setStepsLeft(SrsConfig.INITIAL_STEPS);
      card.setDue((int) Instant.now().getEpochSecond());
      return;
    }

    // 2) Иначе — считаем новый интервал
    int prevIvl = card.getIvl();
    int delay = calculateDelay(card);
    int newIvl = calculateNextInterval(prevIvl, quality, delay, card.getFactor());
    newIvl = constrainInterval(newIvl);

    // 3) Обновляем поля карточки
    card.setIvl(newIvl);
    card.setReps(card.getReps() + 1);

    if (quality == ReviewAnswer.HARD) {
      // уменьшаем factor, но не ниже MIN_FACTOR
      int decreased = card.getFactor() - SrsConfig.HARD_FACTOR_DECREASE;
      int newFactor = Math.max(decreased, SrsConfig.MIN_FACTOR);
      card.setFactor(newFactor);
    }
    if (quality == ReviewAnswer.EASY) {
      // увеличим ease-factor чуть-чуть
      int newFactor = (int) (card.getFactor() * SrsConfig.EASY_BONUS);
      card.setFactor(newFactor);
    }
    card.setType(2);   // 2 = due/review
    card.setQueue(2);  // 2 = review

    // 4) Запланируем следующий показ (число дней от создания + newIvl)
    LocalDate created = card.getCreatedAt().toLocalDate();
    int daysSinceCreation = (int) ChronoUnit.DAYS.between(created, LocalDate.now());
    card.setDue(daysSinceCreation + newIvl);
  }

  /**
   * Возвращает все карточки из заданной коллекции, которым пора быть показанными.
   */
  @Override
  public List<Card> getDueCards(Integer collectionId, LocalDate today) {
    // 1. Находим коллекцию, чтобы взять её дату создания
    Collection coll = collectionRepository.findById(collectionId)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    LocalDate colCreatedDate = coll.getCreatedAt().toLocalDate();

    long nowSec = Instant.now().getEpochSecond();
    int daysSinceCreation = (int) ChronoUnit.DAYS.between(colCreatedDate, today);

    // 2. Берём все карты этой коллекции
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("id")).stream()
            .filter(c -> {
              switch (c.getQueue()) {
                case 0: // new
                  return true;
                case 1: // learning
                case 3: // relearn
                  // due — это UNIX-метка для intraday
                  return c.getDue() <= nowSec;
                case 2: // review
                  // due — это день от создания коллекции
                  return c.getDue() <= daysSinceCreation;
                default:
                  return false;
              }
            })
            .collect(Collectors.toList());
  }

  // --- вспомогательные методы ---

  /**
   * Сколько дней просрочено: текущий день – день, сохранённый в due.
   */
  private int calculateDelay(Card card) {
    LocalDate created = card.getCreatedAt().toLocalDate();
    int daysElapsed = (int) ChronoUnit.DAYS.between(created, LocalDate.now());
    return daysElapsed - card.getDue();
  }

  /**
   * Формула расчёта следующего интервала в днях (без ограничений):
   * HARD = prevIvl * hardFactor
   * GOOD = (prevIvl + delay/2) * ease
   * EASY = (prevIvl + delay) * ease * easyBonus
   */
  private int calculateNextInterval(int prevIvl,
                                    ReviewAnswer quality,
                                    int delay,
                                    int factorPermille) {
    double ease = factorPermille / 1000.0;
    switch (quality) {
      case HARD:
        return (int) (prevIvl * SrsConfig.HARD_FACTOR);
      case GOOD:
        return (int) ((prevIvl + delay / 2.0) * ease);
      case EASY:
        return (int) ((prevIvl + delay) * ease * SrsConfig.EASY_BONUS);
      default:
        throw new IllegalArgumentException("Unexpected quality: " + quality);
    }
  }

  /**
   * Приводим интервал к диапазону [MIN_INTERVAL; MAX_INTERVAL]
   */
  private int constrainInterval(int interval) {
    if (interval < SrsConfig.MIN_INTERVAL) {
      return SrsConfig.MIN_INTERVAL;
    }
    if (interval > SrsConfig.MAX_INTERVAL) {
      return SrsConfig.MAX_INTERVAL;
    }
    return interval;
  }
}
```

### java\com\myapp\flashcards\srs\SrsConfig.java
```java
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
}
```

### java\com\myapp\flashcards\srs\SrsService.java
```java
package com.myapp.flashcards.srs;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;

import java.time.LocalDate;
import java.util.List;

public interface SrsService {
  /**
   * Инициализирует SRS-поля при первом показе новой карточки.
   * Переводит её в очередь learning, выставляет due и stepsLeft.
   */
  void initializeLearning(Card card);

  /**
   * Обрабатывает нажатие кнопки оценки (Again/Hard/Good/Easy).
   * Пересчитывает ivl, factor, reps, lapses, due, queue, stepsLeft.
   */
  default void processReview(Card card, ReviewAnswer quality) {

  }

  /**
   * Возвращает список карточек, которые сегодня надо показать:
   * – все новые (queue=new),
   * – все learning/relearning с due ≤ now,
   * – все review с dueDay ≤ today.
   */
  List<Card> getDueCards(Integer collectionId, LocalDate today);
}

```

### resources\application.yaml
```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${POSTGRES_DATABASE}?currentSchema=${POSTGRES_SCHEMA}
    username: ${POSTGRES_USERNAME}
    password: ${POSTGRES_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: none
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    properties:
      hibernate:
        show_sql: true
        format_sql: true
#    open-in-view: false
  liquibase:
    change-log: classpath:db.changelog-master.xml
    default-schema: flashcards
  config:
    import: optional:file:.env[.properties]
  graphql:
    graphiql:
      enabled: true

jwt:
  secret: ${JWT_SECRET}
  expirationMs: 86400000
```

### resources\db\changelog\v.1.0.0_initial-schema\01-changeset-users-table.xml
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

### resources\db\changelog\v.1.0.0_initial-schema\01-create-users-table.sql
```sql
-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### resources\db\changelog\v.1.0.0_initial-schema\01-drop-users-table.sql
```sql
DROP TABLE users;
```

### resources\db\changelog\v.1.0.0_initial-schema\10-changeset-collections-table.xml
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

### resources\db\changelog\v.1.0.0_initial-schema\10-create-collections-table.sql
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

### resources\db\changelog\v.1.0.0_initial-schema\10-drop-collections-table.sql
```sql
DROP TABLE collections;
```

### resources\db\changelog\v.1.0.0_initial-schema\20-changeset-cards-table.xml
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

### resources\db\changelog\v.1.0.0_initial-schema\20-create-cards-table.sql
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

### resources\db\changelog\v.1.0.0_initial-schema\20-drop-cards-table.sql
```sql
DROP TABLE cards;
```

### resources\db\changelog\v.1.0.0_initial-schema\30-changeset-repetitions-table.xml
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

### resources\db\changelog\v.1.0.0_initial-schema\30-create-repetitions-table.sql
```sql
CREATE TABLE repetitions
(

);
```

### resources\db\changelog\v.1.0.0_initial-schema\db.changelog-v.1.0.0_initial-schema.xml
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

### resources\db-init\initdb.sql
```sql
CREATE SCHEMA IF NOT EXISTS flashcards;
```

### resources\db.changelog-master.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
         http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <preConditions>
        <dbms type="postgresql"/>
    </preConditions>

    <changeSet id="0" author="alyosander">
        <tagDatabase tag="db_init"/>
    </changeSet>

    <include file="/db/changelog/v.1.0.0_initial-schema/db.changelog-v.1.0.0_initial-schema.xml"/>

</databaseChangeLog>
```

### resources\graphql\card.graphqls
```
scalar LocalDateTime

extend type Query {
    card(id: ID!): Card
    cardsByCollectionId(collectionId: ID!): [Card!]!
}

extend type Mutation {
    saveCard(card: CardInp!): Card!
    deleteCard(card: CardInp!): Boolean!
    deleteCardsByCollectionId(collectionId: ID!): Int!
}

input CardInp {
    id: ID
    text: String!
    collectionId: ID!
}

type Card {
    id: ID!
    text: String!
    collection: Collection!
    createdAt: LocalDateTime!
    type: Int!
    queue: Int!
    due: Int!
    ivl: Int!
    factor: Int!
    reps: Int!
    lapses: Int!
    stepsLeft: Int!
}
```

### resources\graphql\collection.graphqls
```
extend type Query {
    collection(id: ID!): Collection
    collectionsByUserId(userId: ID!): [Collection]
}

extend type Mutation {
    saveCollection(collection: CollectionInp!): Collection
    deleteCollection(id: ID!): Boolean
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

### resources\graphql\user.graphqls
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

```xml

<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>

    <groupId>com.myapp</groupId>
    <artifactId>flashcards</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>flashcards</name>
    <description>flashcards</description>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-graphql</artifactId>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>1.5.5.Final</version>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct-processor</artifactId>
            <version>1.5.5.Final</version>
        </dependency>
        <dependency>
            <groupId>org.liquibase</groupId>
            <artifactId>liquibase-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.11.5</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.11.5</version>
            <scope>runtime</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>

</project>
```

- Мне надо добавить алгоритм интервального повторения
- Используй код из репозитория anki для интервального повторения
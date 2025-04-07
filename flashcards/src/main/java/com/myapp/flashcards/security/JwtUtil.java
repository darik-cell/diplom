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

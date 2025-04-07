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

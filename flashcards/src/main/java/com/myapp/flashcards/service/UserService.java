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

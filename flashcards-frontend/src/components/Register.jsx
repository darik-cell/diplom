import React, { useState } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        // Проверка совпадения паролей
        if (password !== confirmPassword) {
            setMessage('Пароли не совпадают!');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.text();

            if (response.ok && data === 'User registered successfully!') {
                setMessage('Пользователь успешно зарегистрирован!');
                // Редирект на страницу входа через 2 секунды
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else if (data === 'Email is already taken!') {
                setMessage('Email уже используется!');
            } else {
                setMessage('Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации', error);
            setMessage('Ошибка соединения');
        }
    };

    return (
        <Container>
            <h2>Регистрация</h2>
            {message && <Alert variant="info">{message}</Alert>}
            <Form onSubmit={handleRegister}>
                <Form.Group className="mb-3" controlId="registerEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Введите email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerPassword">
                    <Form.Label>Пароль</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerConfirmPassword">
                    <Form.Label>Подтверждение пароля</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Подтвердите пароль"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    Зарегистрироваться
                </Button>
            </Form>
        </Container>
    );
};

export default Register;

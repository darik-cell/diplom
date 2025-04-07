import React from 'react';
import {Routes, Route, Navigate, Link, useNavigate} from 'react-router-dom';
import {Navbar, Container, Nav} from 'react-bootstrap';
import Login from './components/Login';
import Register from './components/Register';
import Main from './components/Main';
import AddCards from './components/AddCards';

// Обёртка для приватных маршрутов (требуется токен)
const PrivateRoute = ({children}) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login"/>;
};

// Обёртка для публичных маршрутов (если пользователь уже авторизован, перенаправляем на главную)
const PublicRoute = ({children}) => {
    const token = localStorage.getItem('token');
    return token ? <Navigate to="/"/> : children;
};

const App = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            <Navbar bg="primary" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand as={Link} to="/">Flashcards App</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        {token ? (
                            <Nav className="ms-auto">
                                <Nav.Link onClick={handleLogout}>Выйти</Nav.Link>
                            </Nav>
                        ) : (
                            <Nav className="ms-auto">
                                <Nav.Link as={Link} to="/login">Вход</Nav.Link>
                                <Nav.Link as={Link} to="/register">Регистрация</Nav.Link>
                            </Nav>
                        )}
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container className="mt-4">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <Login/>
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <Register/>
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Main/>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/collection/:collectionId"
                        element={<AddCards/>}
                    />
                </Routes>
            </Container>
        </>
    );
};

export default App;


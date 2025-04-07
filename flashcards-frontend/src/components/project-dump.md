### AddCards.jsx
```
import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

// CodeMirror v6 (через @uiw/react-codemirror)
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// markdown-it и плагины
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import hljs from 'highlight.js';

// Стили GitHub Markdown, highlight.js и KaTeX
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

// Запрос для получения коллекции
const GET_COLLECTION = gql`
    query GetCollection($id: ID!) {
        collection(id: $id) {
            id
            name
        }
    }
`;

// Настройка markdown-it: переносы, подсветка кода и KaTeX
const mdParser = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true, // одиночный перенос строки => <br/>
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>` +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    `</code></pre>`;
            } catch (__) {}
        }
        return `<pre class="hljs"><code>${mdParser.utils.escapeHtml(str)}</code></pre>`;
    }
}).use(markdownItKatex);

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText] = useState("");

    if (loading) {
        return <Container className="mt-4">Загрузка...</Container>;
    }
    if (error) {
        return <Container className="mt-4">Ошибка: {error.message}</Container>;
    }

    const collectionName = data.collection.name;

    return (
        <Container fluid className="mt-4" style={{ width: '100%' }}>
            {/* Шапка с "React" слева и "Предпросмотр" справа в одной строке */}
            <Row className="align-items-center">
                <Col>
                    <h2>React</h2>
                </Col>
                <Col className="text-end">
                    <h2>Предпросмотр</h2>
                </Col>
            </Row>
            <hr />

            {/* Основная область (редактор + просмотр) */}
            <Row>
                {/* Левая колонка: редактор */}
                <Col
                    md={6}
                    style={{
                        padding: 0,
                        borderRight: '1px solid #ccc', // вертикальная линия-разделитель
                        minHeight: '80vh',             // чтобы занять приличную высоту
                    }}
                >
                    <CodeMirror
                        value={cardText}
                        height="80vh"       // Высота редактора
                        width="100%"       // Ширина всей колонки
                        theme={githubLight}
                        extensions={[markdown()]}
                        onChange={(value) => setCardText(value)}
                    />
                </Col>

                {/* Правая колонка: предпросмотр */}
                <Col md={6} style={{ padding: '10px', minHeight: '80vh' }}>
                    {/* Рендерим markdown */}
                    <div
                        className="markdown-body"
                        style={{ width: '100%' }}
                        dangerouslySetInnerHTML={{ __html: mdParser.render(cardText) }}
                    />
                </Col>
            </Row>

            {/* Кнопка "Добавить карточку" */}
            <div className="d-flex justify-content-end mt-3">
                <Button variant="primary" size="sm">
                    Добавить карточку
                </Button>
            </div>
        </Container>
    );
};

export default AddCards;
```

### Login.jsx
```
import React, { useState } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                setMessage('Ошибка авторизации');
                return;
            }

            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                setMessage('Неверные учетные данные');
            }
        } catch (error) {
            console.error('Ошибка авторизации', error);
            setMessage('Ошибка соединения');
        }
    };

    return (
        <Container>
            <h2>Вход</h2>
            {message && <Alert variant="danger">{message}</Alert>}
            <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3" controlId="loginEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Введите email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="loginPassword">
                    <Form.Label>Пароль</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    Войти
                </Button>
            </Form>
        </Container>
    );
};

export default Login;
```

### Main.jsx
```
import React, {useState} from 'react';
import {Container, Button, Form, Spinner} from 'react-bootstrap';
import {gql, useQuery, useMutation} from '@apollo/client';
import {useNavigate} from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';

function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        return decoded.id; // предполагается, что в токене поле "id"
    } catch (error) {
        console.error('Ошибка декодирования токена', error);
        return null;
    }
}

const GET_COLLECTIONS = gql`
    query GetCollections($userId: ID!) {
        collectionsByUserId(userId: $userId) {
            id
            name
        }
    }
`;

const SAVE_COLLECTION = gql`
    mutation SaveCollection($collection: CollectionInp!) {
        saveCollection(collection: $collection) {
            id
            name
        }
    }
`;

const DELETE_COLLECTION = gql`
    mutation DeleteCollection($collection: CollectionInp!) {
        deleteCollection(collection: $collection)
    }
`;

const Main = () => {
    const userId = getUserIdFromToken();
    const navigate = useNavigate();

    const [newName, setNewName] = useState('');
    const [showCreateButton, setShowCreateButton] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState(null);

    const {loading, error, data, refetch} = useQuery(GET_COLLECTIONS, {
        variables: {userId},
        skip: !userId,
    });

    const [saveCollection] = useMutation(SAVE_COLLECTION, {
        onCompleted: () => {
            setNewName('');
            setShowCreateButton(false);
            refetch();
        }
    });

    const [deleteCollection] = useMutation(DELETE_COLLECTION, {
        onCompleted: () => {
            setCollectionToDelete(null);
            refetch();
        }
    });

    const handleCreateCollection = () => {
        if (!newName.trim()) return;
        saveCollection({
            variables: {
                collection: {
                    name: newName,
                    user: {id: userId},
                },
            },
        });
    };

    const handleShowDelete = (id) => {
        setCollectionToDelete(id);
    };

    const handleConfirmDelete = (id) => {
        deleteCollection({
            variables: {
                collection: {id},
            },
        });
    };

    const handleCancelDelete = () => {
        setCollectionToDelete(null);
    };

    // Переход на страницу добавления карточек
    const handleAddCards = (collectionId) => {
        navigate(`/collection/${collectionId}`);
    };

    if (!userId) {
        return <Container className="mt-4">Нет авторизации</Container>;
    }

    if (loading) return <Container className="mt-4"><Spinner animation="border"/></Container>;
    if (error) return <Container className="mt-4">Ошибка: {error.message}</Container>;

    return (
        <Container className="mt-4" style={{maxWidth: "66%"}}>
            <h2>Список коллекций пользователя</h2>

            {data.collectionsByUserId.map((col) => (
                <div key={col.id} style={{display: 'flex', alignItems: 'center', marginBottom: '5px'}}>
                    <span style={{flex: 1}}>{col.name}</span>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddCards(col.id)}
                        style={{marginRight: '5px'}}
                    >
                        +
                    </Button>
                    {collectionToDelete !== col.id ? (
                        <span
                            style={{cursor: 'pointer', color: 'gray'}}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'red')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'gray')}
                            onClick={() => handleShowDelete(col.id)}
                        >
              🗑
            </span>
                    ) : (
                        <span>
              Удалить?{' '}
                            <Button variant="outline-success" size="sm"
                                    onClick={() => handleConfirmDelete(col.id)}>✓</Button>{' '}
                            <Button variant="outline-danger" size="sm" onClick={handleCancelDelete}>×</Button>
            </span>
                    )}
                </div>
            ))}

            <div style={{marginTop: '20px', position: 'relative', width: '300px'}}>
                <Form.Control
                    type="text"
                    placeholder="Новая коллекция"
                    value={newName}
                    onChange={(e) => {
                        setNewName(e.target.value);
                        if (!e.target.value.trim()) {
                            setShowCreateButton(false);
                        } else {
                            setShowCreateButton(true);
                        }
                    }}
                />
                {showCreateButton && newName.trim() && (
                    <Button
                        variant="success"
                        size="sm"
                        style={{position: 'absolute', right: '-50px', top: '0'}}
                        onClick={handleCreateCollection}
                    >
                        ✓
                    </Button>
                )}
            </div>
        </Container>
    );
};

export default Main;
```

### Register.jsx
```
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
```


### Dockerfile
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### package.json
```json
{
  "name": "flashcards-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@apollo/client": "^3.13.6",
    "@codemirror/lang-markdown": "^6.3.2",
    "@replit/codemirror-vim": "^6.3.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^13.5.0",
    "@uiw/codemirror-theme-github": "^4.23.10",
    "@uiw/react-codemirror": "^4.23.10",
    "ace-builds": "^1.39.1",
    "bootstrap": "^5.3.5",
    "github-markdown-css": "^5.8.1",
    "graphql": "^16.10.0",
    "highlight.js": "^11.11.1",
    "jwt-decode": "^4.0.0",
    "katex": "^0.16.21",
    "markdown-it": "^14.1.0",
    "markdown-it-highlightjs": "^4.2.0",
    "markdown-it-katex": "^2.0.3",
    "react": "^19.1.0",
    "react-ace": "^14.0.1",
    "react-bootstrap": "^2.10.9",
    "react-dom": "^19.1.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.5.0",
    "react-scripts": "5.0.1",
    "react-simplemde-editor": "^5.2.0",
    "rehype-highlight": "^7.0.2",
    "rehype-katex": "^7.0.1",
    "remark-gfm": "^4.0.1",
    "remark-math": "^6.0.0",
    "simplemde": "^1.11.2",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### public\favicon.ico
```
Ошибка чтения файла: Input length = 1
```

### public\index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <!--
      manifest.json provides metadata used when your web app is installed on a
      user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/
    -->
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <!--
      Notice the use of %PUBLIC_URL% in the tags above.
      It will be replaced with the URL of the `public` folder during the build.
      Only files inside the `public` folder can be referenced from the HTML.

      Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
      work correctly both with client-side routing and a non-root public URL.
      Learn how to configure a non-root public URL by running `npm run build`.
    -->
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <!--
      This HTML file is a template.
      If you open it directly in the browser, you will see an empty page.

      You can add webfonts, meta tags, or analytics to this file.
      The build step will place the bundled scripts into the <body> tag.

      To begin the development, run `npm start` or `yarn start`.
      To create a production bundle, use `npm run build` or `yarn build`.
    -->
  </body>
</html>
```

### public\logo192.png
```
Ошибка чтения файла: Input length = 1
```

### public\logo512.png
```
Ошибка чтения файла: Input length = 1
```

### public\manifest.json
```json
{
  "short_name": "React App",
  "name": "Create React App Sample",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

### public\robots.txt
```
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:
```

### src\apolloClient.js
```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Создаём http-ссылку на GraphQL endpoint
const httpLink = createHttpLink({
    uri: 'http://localhost:8080/graphql',
});

// Добавляем заголовок авторизации (если есть токен)
const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    };
});

// Создаём Apollo Client
const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

export default client;
```

### src\App.css
```css
.App {
  text-align: center;
}

.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

### src\App.jsx
```
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

```

### src\components\AddCards.jsx
```
import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// Для Vim-режима
import { vim } from '@replit/codemirror-vim';
import { keymap } from '@codemirror/view';
import { lineNumbers } from '@codemirror/view';
import { StateField } from '@codemirror/state';

// Markdown-it и плагины:
import MarkdownIt from 'markdown-it';
import mk from 'markdown-it-katex';
import hljs from 'markdown-it-highlightjs';
// CSS для подсветки/KaTeX
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const GET_COLLECTION = gql`
    query GetCollection($id: ID!) {
        collection(id: $id) {
            id
            name
        }
    }
`;

// Пример плагина для относительной нумерации строк:
const relativeLineNumbers = lineNumbers({
    formatNumber: (lineNo, state) => {
        // Текущая строка
        const currentLine = state.doc.lineAt(state.selection.main.head).number;
        // Если номер совпадает — показываем как есть, иначе считаем расстояние
        return (lineNo === currentLine)
            ? String(lineNo)
            : String(Math.abs(lineNo - currentLine));
    }
});

// Создадим keymap для "jj" -> Escape в Vim
function jjKeymap() {
    return keymap.of([
        {
            key: 'j',
            run: (view) => {
                // Здесь упрощённый вариант: если быстро нажимаем j дважды подряд,
                // переключаемся в Normal Mode
                const now = Date.now();
                const state = view.state.field(vimState, false);
                if (!state) return false; // если вдруг нет vimState — выходим

                // Внутренние данные vimState
                const { lastKeyDownTime, lastKey } = state;

                // Логика: если предыдущая клавиша была 'j' и времени прошло < 300ms
                if (lastKey === 'j' && (now - lastKeyDownTime < 300)) {
                    // Принудительно уходим в Normal Mode
                    vim().commands.esc(view);
                    return true;
                }
                return false;
            }
        }
    ]);
}

// Внутренний доступ к VimState (неофициально)
const vimState = StateField.define({
    create: () => ({ lastKey: null, lastKeyDownTime: 0 }),
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            // nothing special
        }
        if (tr.userEvent && tr.userEvent.startsWith("input.type")) {
            // когда вводим символ
            const now = Date.now();
            // последняя нажатая клавиша
            const ch = tr.newDoc.sliceString(tr.changes.from, tr.changes.to);
            return { lastKey: ch, lastKeyDownTime: now };
        }
        return value;
    },
});

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText] = useState('');
    const [vimMode, setVimMode] = useState(false);

    // Инициализируем markdown-it
    const md = useMemo(() => {
        return new MarkdownIt({ linkify: true, typographer: true })
            .use(mk)     // для формул KaTeX
            .use(hljs);  // для подсветки
    }, []);

    // Базовые расширения для CodeMirror
    const baseExtensions = useMemo(() => [markdown(), relativeLineNumbers], []);

    // Если включён vim
    const vimExtensions = useMemo(() => {
        if (!vimMode) return baseExtensions;
        return [
            ...baseExtensions,
            vim(),
            // Поле для фиксации последней клавиши (для "jj")
            vimState,
            jjKeymap(),
        ];
    }, [vimMode, baseExtensions]);

    if (loading) {
        return <Container fluid style={{ maxWidth: '100%' }} className="mt-4">Загрузка...</Container>;
    }
    if (error) {
        return (
            <Container fluid style={{ maxWidth: '100%' }} className="mt-4">
                Ошибка: {error.message}
            </Container>
        );
    }

    return (
        <Container fluid style={{ maxWidth: '100%' }} className="mt-4 px-0">
            <Row className="align-items-center mx-0">
                <Col>
                    <h2>Редактор ({data.collection.name})</h2>
                </Col>
                <Col className="text-end">
                    <h2>Предпросмотр</h2>
                </Col>
            </Row>
            <hr />

            {/*
        Высота 100vh - 160px, чтобы занимать почти весь экран.
        overflow: 'hidden' – чтобы не было общей прокрутки по Row.
      */}
            <Row
                className="mx-0"
                style={{ height: 'calc(100vh - 160px)', overflow: 'hidden' }}
            >
                {/* Левая половина без полосы прокрутки */}
                <Col
                    md={6}
                    className="px-0"
                    style={{ borderRight: '1px solid #ccc', overflowY: 'hidden' }}
                >
                    <CodeMirror
                        value={cardText}
                        theme={githubLight}
                        extensions={vimExtensions}
                        height="100%"
                        onChange={(value) => setCardText(value)}
                    />
                </Col>

                {/* Правая половина тоже без скроллбара */}
                <Col
                    md={6}
                    className="px-3 no-scrollbar"
                    style={{ overflow: 'auto', height: '100%' }}
                >
                    <div
                        dangerouslySetInnerHTML={{ __html: md.render(cardText) }}
                    />
                </Col>
            </Row>

            <div
                className="d-flex justify-content-between align-items-center p-3"
                style={{ borderTop: '1px solid #ccc' }}
            >
                <Button
                    variant={vimMode ? "secondary" : "outline-secondary"}
                    size="sm"
                    onClick={() => setVimMode((prev) => !prev)}
                >
                    {vimMode ? "Отключить Vim" : "Включить Vim"}
                </Button>

                <Button variant="primary" size="sm">
                    Добавить карточку
                </Button>
            </div>
        </Container>
    );
};

export default AddCards;
```

### src\components\Login.jsx
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

### src\components\Main.jsx
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

### src\components\Register.jsx
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

### src\index.css
```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.no-scrollbar {
  overflow: auto;
  scrollbar-width: none;        // Firefox
-ms-overflow-style: none;     // IE, Edge
}
.no-scrollbar::-webkit-scrollbar {
  width: 0;
  height: 0;
}
```

### src\index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
        <ApolloProvider client={client}>
            <App />
        </ApolloProvider>
    </BrowserRouter>
);
```

### src\logo.svg
```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 841.9 595.3"><g fill="#61DAFB"><path d="M666.3 296.5c0-32.5-40.7-63.3-103.1-82.4 14.4-63.6 8-114.2-20.2-130.4-6.5-3.8-14.1-5.6-22.4-5.6v22.3c4.6 0 8.3.9 11.4 2.6 13.6 7.8 19.5 37.5 14.9 75.7-1.1 9.4-2.9 19.3-5.1 29.4-19.6-4.8-41-8.5-63.5-10.9-13.5-18.5-27.5-35.3-41.6-50 32.6-30.3 63.2-46.9 84-46.9V78c-27.5 0-63.5 19.6-99.9 53.6-36.4-33.8-72.4-53.2-99.9-53.2v22.3c20.7 0 51.4 16.5 84 46.6-14 14.7-28 31.4-41.3 49.9-22.6 2.4-44 6.1-63.6 11-2.3-10-4-19.7-5.2-29-4.7-38.2 1.1-67.9 14.6-75.8 3-1.8 6.9-2.6 11.5-2.6V78.5c-8.4 0-16 1.8-22.6 5.6-28.1 16.2-34.4 66.7-19.9 130.1-62.2 19.2-102.7 49.9-102.7 82.3 0 32.5 40.7 63.3 103.1 82.4-14.4 63.6-8 114.2 20.2 130.4 6.5 3.8 14.1 5.6 22.5 5.6 27.5 0 63.5-19.6 99.9-53.6 36.4 33.8 72.4 53.2 99.9 53.2 8.4 0 16-1.8 22.6-5.6 28.1-16.2 34.4-66.7 19.9-130.1 62-19.1 102.5-49.9 102.5-82.3zm-130.2-66.7c-3.7 12.9-8.3 26.2-13.5 39.5-4.1-8-8.4-16-13.1-24-4.6-8-9.5-15.8-14.4-23.4 14.2 2.1 27.9 4.7 41 7.9zm-45.8 106.5c-7.8 13.5-15.8 26.3-24.1 38.2-14.9 1.3-30 2-45.2 2-15.1 0-30.2-.7-45-1.9-8.3-11.9-16.4-24.6-24.2-38-7.6-13.1-14.5-26.4-20.8-39.8 6.2-13.4 13.2-26.8 20.7-39.9 7.8-13.5 15.8-26.3 24.1-38.2 14.9-1.3 30-2 45.2-2 15.1 0 30.2.7 45 1.9 8.3 11.9 16.4 24.6 24.2 38 7.6 13.1 14.5 26.4 20.8 39.8-6.3 13.4-13.2 26.8-20.7 39.9zm32.3-13c5.4 13.4 10 26.8 13.8 39.8-13.1 3.2-26.9 5.9-41.2 8 4.9-7.7 9.8-15.6 14.4-23.7 4.6-8 8.9-16.1 13-24.1zM421.2 430c-9.3-9.6-18.6-20.3-27.8-32 9 .4 18.2.7 27.5.7 9.4 0 18.7-.2 27.8-.7-9 11.7-18.3 22.4-27.5 32zm-74.4-58.9c-14.2-2.1-27.9-4.7-41-7.9 3.7-12.9 8.3-26.2 13.5-39.5 4.1 8 8.4 16 13.1 24 4.7 8 9.5 15.8 14.4 23.4zM420.7 163c9.3 9.6 18.6 20.3 27.8 32-9-.4-18.2-.7-27.5-.7-9.4 0-18.7.2-27.8.7 9-11.7 18.3-22.4 27.5-32zm-74 58.9c-4.9 7.7-9.8 15.6-14.4 23.7-4.6 8-8.9 16-13 24-5.4-13.4-10-26.8-13.8-39.8 13.1-3.1 26.9-5.8 41.2-7.9zm-90.5 125.2c-35.4-15.1-58.3-34.9-58.3-50.6 0-15.7 22.9-35.6 58.3-50.6 8.6-3.7 18-7 27.7-10.1 5.7 19.6 13.2 40 22.5 60.9-9.2 20.8-16.6 41.1-22.2 60.6-9.9-3.1-19.3-6.5-28-10.2zM310 490c-13.6-7.8-19.5-37.5-14.9-75.7 1.1-9.4 2.9-19.3 5.1-29.4 19.6 4.8 41 8.5 63.5 10.9 13.5 18.5 27.5 35.3 41.6 50-32.6 30.3-63.2 46.9-84 46.9-4.5-.1-8.3-1-11.3-2.7zm237.2-76.2c4.7 38.2-1.1 67.9-14.6 75.8-3 1.8-6.9 2.6-11.5 2.6-20.7 0-51.4-16.5-84-46.6 14-14.7 28-31.4 41.3-49.9 22.6-2.4 44-6.1 63.6-11 2.3 10.1 4.1 19.8 5.2 29.1zm38.5-66.7c-8.6 3.7-18 7-27.7 10.1-5.7-19.6-13.2-40-22.5-60.9 9.2-20.8 16.6-41.1 22.2-60.6 9.9 3.1 19.3 6.5 28.1 10.2 35.4 15.1 58.3 34.9 58.3 50.6-.1 15.7-23 35.6-58.4 50.6zM320.8 78.4z"/><circle cx="420.9" cy="296.5" r="45.7"/><path d="M520.5 78.1z"/></g></svg>
```


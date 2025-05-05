import React, {useState} from 'react';
import {Container, Button, Form, Spinner, Table} from 'react-bootstrap';
import {gql, useQuery, useMutation} from '@apollo/client';
import {useNavigate} from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import {Link} from 'react-router-dom';

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
            countCards
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

// Новая мутация для удаления коллекции
const DELETE_COLLECTION = gql`
    mutation DeleteCollection($id: ID!) {
        deleteCollection(id: $id)
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
        // Можно добавить fetchPolicy: 'cache-and-network' для актуализации данных
    });

    const [saveCollection] = useMutation(SAVE_COLLECTION, {
        onCompleted: () => {
            setNewName('');
            setShowCreateButton(false);
            refetch();
        },
    });

    const [deleteCollection] = useMutation(DELETE_COLLECTION, {
        onCompleted: (data) => {
            // Если mutation вернула true, можно обновить список либо полность через refetch
            if (data.deleteCollection) {
                setCollectionToDelete(null);
                refetch();
            }
        },
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
            variables: {id},
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

    if (loading)
        return (
            <Container className="mt-4">
                <Spinner animation="border"/>
            </Container>
        );
    if (error)
        return <Container className="mt-4">Ошибка: {error.message}</Container>;

    return (
        <Container className="mt-4" style={{maxWidth: '66%'}}>
            <h2>Список коллекций пользователя</h2>

            <div className="p-3 mb-4 bg-white rounded shadow">
                <Table bordered hover responsive className="mb-0">
                    <thead>
                    <tr>
                        <th style={{width: '40%'}}>Коллекция</th>
                        <th>Всего карточек</th>
                        <th>Новые карточки</th>
                        <th>К просмотру</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.collectionsByUserId.map((col) => (
                        <tr key={col.id}>
                            <td>
                                <Link to={`/repeat/${col.id}`}>{col.name}</Link>
                            </td>
                            <td>{col.countCards}</td>
                            <td>
                                <span className="text-primary">0</span>
                            </td>
                            <td>
                                <span className="text-success">0</span>
                            </td>
                            <td>
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
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={() => handleConfirmDelete(col.id)}
                                        >
                        ✓
                      </Button>{' '}
                                        <Button variant="outline-danger" size="sm" onClick={handleCancelDelete}>
                        ×
                      </Button>
                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>

            <div style={{marginTop: '20px', position: 'relative', width: '300px'}}>
                <Form.Control
                    type="text"
                    placeholder="Новая коллекция"
                    value={newName}
                    onChange={(e) => {
                        setNewName(e.target.value);
                        setShowCreateButton(e.target.value.trim() !== '');
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

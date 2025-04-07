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

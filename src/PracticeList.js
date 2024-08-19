import React, { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, writeBatch} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase'; 
import { signOut } from 'firebase/auth';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns'; 
import './PracticeList.css';

const db = getFirestore();

const PracticeList = () => {
  // State variables
  const [practices, setPractices] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [conflictTime, setConflictTime] = useState('');
  const [conflictReason, setConflictReason] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editPracticeMode, setEditPracticeMode] = useState(false);
  const [editConflictMode, setEditConflictMode] = useState(false);  
  const [newPracticeDate, setNewPracticeDate] = useState(new Date());
  const [newPracticeTime, setNewPracticeTime] = useState('');
  const [newPracticeLocation, setNewPracticeLocation] = useState('');
  const [addPracticeMode, setAddPracticeMode] = useState(false);
  const [conflicts, setConflicts] = useState({});
  const [conflictApproval, setConflictApproval] = useState({}); // Add this line
  const [users, setUsers] = useState({}); // To store user display names
  const [deletePracticeMode, setDeletePracticeMode] = useState(false); // State to manage delete confirmation
  const [deleteConflictMode, setDeleteConflictMode] = useState(false); // State to manage delete confirmation
  const [selectedConflictId, setSelectedConflictId] = useState(null);

  const getDayOfWeek = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };
  
  // Function to fetch practices and conflicts
  const fetchPracticesAndConflicts = async () => {
    try {
      const practicesRef = collection(db, 'practices');
      const today = new Date();
      const todayString = format(today, 'yyyy-MM-dd');
      const endDate = new Date();
      endDate.setDate(today.getDate() + 7);
      const endDateString = format(endDate, 'yyyy-MM-dd');
  
      const practicesQuery = query(
        practicesRef,
        where('date', '>=', todayString),
        where('date', '<=', endDateString)
      );
  
      const practicesSnapshot = await getDocs(practicesQuery);
      const practicesData = practicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      // Sort the practices by date
      practicesData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
      if (practicesData.length === 0) {
        console.log("No practices found within the date range");
        setPractices([]);
        setConflicts({});
        return;
      }
  
      const conflictsRef = collection(db, 'conflicts');
      const conflictsQuery = query(conflictsRef, where('practiceId', 'in', practicesData.map(p => p.id)));
      const conflictsSnapshot = await getDocs(conflictsQuery);
      const conflictsData = conflictsSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        if (!acc[data.practiceId]) {
          acc[data.practiceId] = [];
        }
        acc[data.practiceId].push({ id: doc.id, ...data }); // Include doc.id
        return acc;
      }, {});
      
  
      // Fetch user display names
      const userIds = Array.from(new Set(conflictsSnapshot.docs.map(doc => doc.data().dancerId)));
  
      if (userIds.length > 0) {
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('__name__', 'in', userIds));
        const usersSnapshot = await getDocs(usersQuery);
  
        // Accumulate user data
        const usersData = usersSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = data.displayName; // Use document ID as the key
          return acc;
        }, {});
  
        // Update state with users data
        setUsers(usersData);
      }
  
      // Update state with practices and conflicts data
      setPractices(practicesData);
      setConflicts(conflictsData);

      // Fetch conflict approval data
      const conflictIds = conflictsSnapshot.docs.map(doc => doc.id);
      await fetchConflictApprovalData(conflictIds);
    } catch (error) {
      console.error("Error fetching practices and conflicts: ", error);
    }
  };

  const fetchConflictApprovalData = async (conflictIds) => {
    try {
      if (conflictIds.length > 0) {
        const conflictsRef = collection(db, 'conflicts');
        const conflictsQuery = query(conflictsRef, where('__name__', 'in', conflictIds));
        const conflictsSnapshot = await getDocs(conflictsQuery);
    
        const conflictApprovalData = conflictsSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = data.approved || false; // Set default value to false if not present
          return acc;
        }, {});
    
        setConflictApproval(conflictApprovalData);
      }
    } catch (error) {
      console.error("Error fetching conflict approval data: ", error);
    }
  };
  

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid); // Set the userId state
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          if (userSnapshot.exists()) {
            setUserRole(userSnapshot.data().role);
          } else {
            console.error("No such user document!");
          }
        } else {
          console.error("User is not authenticated");
        }
      } catch (error) {
        console.error("Error fetching user role: ", error);
      }
    };    

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserRole();
        fetchPracticesAndConflicts();
      } else {
        console.error("User is not authenticated");
      }
    });
  
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString) => {
    // Convert the date string to a Date object
    const date = parseISO(dateString);
    // Format the date as 'MM/dd/yyyy'
    return format(date, 'MM/dd/yyyy');
  };

  const handleAddConflict = async () => {
    try {
      const conflictsRef = collection(db, 'conflicts');
      const user = auth.currentUser;
      await addDoc(conflictsRef, {
        dancerId: user?.uid,
        practiceId: selectedPractice?.id,
        conflictTime,
        reason: conflictReason
      });
  
      // Fetch conflicts and users again to ensure data consistency
      await fetchPracticesAndConflicts();
  
      setModalVisible(false);
      setConflictTime('');
      setConflictReason('');
    } catch (error) {
      console.error("Error adding conflict: ", error);
    }
  };

  const handleEditConflict = async () => {
    try {
      if (selectedConflictId) {
        if (typeof selectedConflictId !== 'string') {
          console.error("Invalid conflict ID:", selectedConflictId);
          return;
        }
  
        const conflictRef = doc(db, 'conflicts', selectedConflictId);
        await updateDoc(conflictRef, {
          conflictTime,
          reason: conflictReason
        });
  
        await fetchPracticesAndConflicts();
  
        setEditConflictMode(false);
        setModalVisible(false);
        setConflictTime('');
        setConflictReason('');
        setSelectedConflictId(null);
      }
    } catch (error) {
      console.error("Error updating conflict:", error);
    }
  };
  
  const handleApproveConflict = async (conflictId) => {
    try {
      const conflictRef = doc(db, 'conflicts', conflictId);
      await updateDoc(conflictRef, {
        approved: true
      });
    
      // Update the state to reflect the changes
      setConflictApproval(prev => ({ ...prev, [conflictId]: true }));
    } catch (error) {
      console.error("Error approving conflict:", error);
    }
  };
  
  const handleRejectConflict = async (conflictId) => {
    try {
      const conflictRef = doc(db, 'conflicts', conflictId);
      await updateDoc(conflictRef, {
        approved: false
      });
    
      // Update the state to reflect the changes
      setConflictApproval(prev => ({ ...prev, [conflictId]: false }));
    } catch (error) {
      console.error("Error rejecting conflict:", error);
    }
  };
  
  const handleDeleteConflict = async () => {
    try {
      if (selectedConflictId) {
        const conflictRef = doc(db, 'conflicts', selectedConflictId);
        await deleteDoc(conflictRef);
    
        // Fetch conflicts and users again to ensure data consistency
        await fetchPracticesAndConflicts();
    
        setModalVisible(false);
        setEditConflictMode(false);
        setSelectedConflictId(null);
      }
    } catch (error) {
      console.error("Error deleting conflict: ", error);
    }
  };

  const handleEditPractice = async () => {
    try {
      if (editPracticeMode && selectedPractice) {
        const dayOfWeek = getDayOfWeek(newPracticeDate);
        const practiceRef = doc(db, 'practices', selectedPractice.id);
        await updateDoc(practiceRef, {
          date: format(newPracticeDate, 'yyyy-MM-dd'), // Store date as 'yyyy-MM-dd'
          day: dayOfWeek,
          time: newPracticeTime,
          location: newPracticeLocation,
        });
  
        // Update local state to reflect the changes immediately
        setPractices(prevPractices => prevPractices.map(practice =>
          practice.id === selectedPractice.id
            ? { ...practice, date: format(newPracticeDate, 'yyyy-MM-dd'), day: dayOfWeek, time: newPracticeTime, location: newPracticeLocation }
            : practice
        ));
  
        // Reset the edit mode
        setEditPracticeMode(false);
        setSelectedPractice(null);
        setNewPracticeDate(new Date());
        setNewPracticeTime('');
        setNewPracticeLocation('');
      }
    } catch (error) {
      console.error("Error updating practice: ", error);
    }
  };
  

  const handleAddPractice = async () => {
    try {
      const dayOfWeek = getDayOfWeek(newPracticeDate);
      const newPractice = {
        date: format(newPracticeDate, 'yyyy-MM-dd'), // Store date as 'yyyy-MM-dd'
        day: dayOfWeek,
        time: newPracticeTime,
        location: newPracticeLocation,
      };
  
      const practicesRef = collection(db, 'practices');
      const docRef = await addDoc(practicesRef, newPractice);
  
      // Add the new practice to the state and sort the practices by date
      setPractices(prev => {
        const updatedPractices = [...prev, { id: docRef.id, ...newPractice }];
        return updatedPractices.sort((a, b) => new Date(a.date) - new Date(b.date));
      });
  
      setAddPracticeMode(false);
      setNewPracticeDate(new Date()); // Reset date picker
      setNewPracticeTime('');
      setNewPracticeLocation('');
    } catch (error) {
      console.error("Error adding practice: ", error);
    }
  };

  const handleDeletePractice = async () => {
    try {
      if (selectedPractice) {
        const conflictsRef = collection(db, 'conflicts');
        const conflictsQuery = query(conflictsRef, where('practiceId', '==', selectedPractice.id));
        const conflictsSnapshot = await getDocs(conflictsQuery);
  
        // Delete all conflicts associated with the practice
        const batch = writeBatch(db); 
        conflictsSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
  
        // Now delete the practice itself
        const practiceRef = doc(db, 'practices', selectedPractice.id);
        await deleteDoc(practiceRef);
  
        // Update the practices state to remove the deleted practice
        setPractices(prevPractices => prevPractices.filter(practice => practice.id !== selectedPractice.id));
  
        // Close the confirmation modal and reset selected practice
        setDeletePracticeMode(false); // Close the delete confirmation modal
        setSelectedPractice(null); // Reset the selected practice
      }
    } catch (error) {
      console.error("Error deleting practice and its conflicts: ", error);
    }
  };
  
  
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to login screen or handle logout state
      navigate("/"); // Use navigate to redirect to the login page
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleAddPracticeClick = () => {
    setAddPracticeMode(true);
    setNewPracticeDate(new Date()); // Reset date picker to today's date
    setNewPracticeTime(''); // Reset time field
    setNewPracticeLocation(''); // Reset location field
  };

  const handleEditPracticeClick = (practice) => {
    setSelectedPractice(practice);
    setEditPracticeMode(true);
    setNewPracticeDate(parseISO(practice.date));  // Set the date picker to the current selected practice's date
    setNewPracticeTime(practice.time);
    setNewPracticeLocation(practice.location);
  };
  

  return (
    <div>
      <div className="header">
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      <h2>Practice Schedule</h2> {/* Add the title here */}
      <div className="practice-list">
        {userRole === 'Captain' && (
          <>
            <button onClick={handleAddPracticeClick} className="new-prac-button">
              Add New Practice
            </button>
          </>
        )}
            
        {practices.map((item) => (
          <div key={item.id} className="practice-item">
            <p>{formatDate(item.date)}</p>
            <p>
              <b>{item.day}</b> {item.time} @ {item.location}
            </p>
            {conflicts[item.id] && conflicts[item.id].length > 0 && (
              <div className="conflicts">
                <h4>Conflicts:</h4>
                {conflicts[item.id]?.map((conflict) => (
                  <div
                  key={conflict.id}
                  className={`conflict-item ${conflict.dancerId === userId ? 'user-conflict' : ''}`}
                  >
                    <p>
                      {users[conflict.dancerId]} - {conflict.conflictTime} - {conflict.reason}
                      {conflict.dancerId === userId && (
                        <>
                          <button
                            className="conflict-buttons"
                            onClick={() => {
                              setEditConflictMode(true);
                              setSelectedPractice(item);
                              setSelectedConflictId(conflict.id);
                              setConflictTime(conflict.conflictTime);
                              setConflictReason(conflict.reason);
                              setModalVisible(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="conflict-buttons"
                            onClick={() => {
                              setSelectedConflictId(conflict.id);
                              setDeleteConflictMode(true);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {/* Add approval buttons here */}
                      {userRole === 'Captain' && !conflictApproval[conflict.id] && (
                        <button className="conflict-buttons" onClick={() => handleApproveConflict(conflict.id)}>Approve</button>
                      )}
                      {userRole === 'Captain' && conflictApproval[conflict.id] && (
                        <button className="conflict-buttons" onClick={() => handleRejectConflict(conflict.id)}>Reject</button>
                      )}
                      {/* {userRole === 'Captain' && conflictApproval[conflict.id] && <span>Approved</span>}
                      {userRole === 'Captain' && !conflictApproval[conflict.id] && <span>Pending Approval</span>} */}
                      {(userRole === 'Captain' || conflict.dancerId === userId) && conflictApproval[conflict.id] && <span> ✅</span>}
                      {/* {(userRole === 'Captain' || conflict.dancerId === userId) && !conflictApproval[conflict.id] && <span></span>} */}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="button-group">
              {userRole === 'Captain' && (
                <>
                  <button
                    onClick={() => handleEditPracticeClick(item)}
                  >
                    Edit Practice
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPractice(item);
                      setDeletePracticeMode(true);
                    }}
                  >
                    Delete Practice
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setSelectedPractice(item);
                  setModalVisible(true);
                }}
              >
                Add Conflict
              </button>
            </div>
          </div>
        ))}

        {selectedPractice && modalVisible && (
          <div className="modal">
            <div className="modal-content">
              <input
                type="text"
                placeholder="Conflict Time (e.g., 8-9pm)"
                value={conflictTime}
                onChange={(e) => setConflictTime(e.target.value)}
              />
              <input
                type="text"
                placeholder="Reason (e.g., midterm)"
                value={conflictReason}
                onChange={(e) => setConflictReason(e.target.value)}
              />
              <button onClick={handleAddConflict}>Submit</button>
              <button onClick={() => setModalVisible(false)}>Cancel</button>
            </div>
          </div>
        )}

      </div>
  
      {selectedPractice && modalVisible && (
        <div className="modal">
          <div className="modal-content">
            <input
              type="text"
              placeholder="Conflict Time (e.g., 8-9pm)"
              value={conflictTime}
              onChange={(e) => setConflictTime(e.target.value)}
            />
            <input
              type="text"
              placeholder="Reason (e.g., midterm)"
              value={conflictReason}
              onChange={(e) => setConflictReason(e.target.value)}
            />
            <button onClick={handleAddConflict}>Submit</button>
            <button onClick={() => setModalVisible(false)}>Cancel</button>
          </div>
        </div>
      )}
  
      {addPracticeMode && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Practice</h3>
            <DatePicker
              selected={newPracticeDate}
              onChange={(date) => setNewPracticeDate(date)}
              dateFormat="yyyy/MM/dd"
              placeholderText="Select a date"
            />
            <input
              type="text"
              placeholder="New Practice Time"
              value={newPracticeTime}
              onChange={(e) => setNewPracticeTime(e.target.value)}
            />
            <input
              type="text"
              placeholder="New Practice Location"
              value={newPracticeLocation}
              onChange={(e) => setNewPracticeLocation(e.target.value)}
            />
            <button onClick={handleAddPractice}>Submit</button>
            <button onClick={() => setAddPracticeMode(false)}>Cancel</button>
          </div>
        </div>
      )}

      {editPracticeMode && selectedPractice && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Practice</h3>
            <DatePicker
              selected={newPracticeDate}
              onChange={(date) => setNewPracticeDate(date)}
            />
            <input
              type="text"
              placeholder="Edit Practice Time"
              value={newPracticeTime}
              onChange={(e) => setNewPracticeTime(e.target.value)}
            />
            <input
              type="text"
              placeholder="Edit Practice Location"
              value={newPracticeLocation}
              onChange={(e) => setNewPracticeLocation(e.target.value)}
            />
            <button onClick={handleEditPractice}>Submit</button>
            <button
              onClick={() => {
                setEditPracticeMode(false);
                setSelectedPractice(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
  
      {deletePracticeMode && selectedPractice && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this practice?</p>
            <button onClick={handleDeletePractice}>Yes, Delete</button>
            <button
              onClick={() => {
                setDeletePracticeMode(false);
                setSelectedPractice(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

       {/* Edit Conflict Modal */}
      {editConflictMode && selectedPractice && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Conflict</h3>
            <input
              type="text"
              placeholder="Conflict Time (e.g., 8-9pm)"
              value={conflictTime}
              onChange={(e) => setConflictTime(e.target.value)}
            />
            <input
              type="text"
              placeholder="Reason (e.g., midterm)"
              value={conflictReason}
              onChange={(e) => setConflictReason(e.target.value)}
            />
            <button onClick={handleEditConflict}>Submit</button>
            <button
              onClick={() => {
                setEditConflictMode(false);
                setSelectedPractice(null);
                setSelectedConflictId(null);
                setModalVisible(false); // Ensure modals are closed
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteConflictMode && selectedConflictId && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm Delete Conflict</h3>
            <p>Are you sure you want to delete this conflict?</p>
            <button onClick={handleDeleteConflict}>Yes, Delete</button>
            <button
              onClick={() => {
                setDeleteConflictMode(false);
                setSelectedConflictId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeList;
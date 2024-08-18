import React, { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth } from './firebase'; // Update the path as necessary
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatInTimeZone } from 'date-fns-tz'; // Updated import
import './PracticeList.css'; // Add your CSS file for styling

const db = getFirestore();

const PracticeList = () => {
  // State variables
  const [practices, setPractices] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [conflictTime, setConflictTime] = useState('');
  const [conflictReason, setConflictReason] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newPracticeDate, setNewPracticeDate] = useState(new Date());
  const [newPracticeTime, setNewPracticeTime] = useState('');
  const [newPracticeLocation, setNewPracticeLocation] = useState('');
  const [addPracticeMode, setAddPracticeMode] = useState(false);
  const [conflicts, setConflicts] = useState({});
  const [users, setUsers] = useState({}); // To store user display names

  const getDayOfWeek = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };
  
  // Function to fetch practices and conflicts
  const fetchPracticesAndConflicts = async () => {
    try {
      const practicesRef = collection(db, 'practices');
      const today = new Date();
      const todayString = today.toLocaleDateString('en-CA');
      const endDate = new Date();
      endDate.setDate(today.getDate() + 7);
      const endDateString = endDate.toLocaleDateString('en-CA');
  
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
        acc[data.practiceId].push(data);
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
    } catch (error) {
      console.error("Error fetching practices and conflicts: ", error);
    }
  };
  

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
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
    const timeZone = 'America/Chicago'; // Change this to the user's timezone if needed

    // Convert the date string to a Date object
    const date = new Date(dateString);

    // Format the date in the desired timezone
    return formatInTimeZone(date, timeZone, 'MM/dd/yyyy');
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

  const handleEditPractice = async () => {
    try {
      if (editMode && selectedPractice) {
        const dayOfWeek = getDayOfWeek(newPracticeDate);
        const practiceRef = doc(db, 'practices', selectedPractice.id);
        await updateDoc(practiceRef, {
          date: newPracticeDate.toISOString().split('T')[0],
          day: dayOfWeek,
          time: newPracticeTime,
          location: newPracticeLocation,
        });
  
        // Update local state to reflect the changes immediately
        setPractices(prevPractices => prevPractices.map(practice =>
          practice.id === selectedPractice.id
            ? { ...practice, date: newPracticeDate.toISOString().split('T')[0], day: dayOfWeek, time: newPracticeTime, location: newPracticeLocation }
            : practice
        ));
  
        // Reset the edit mode
        setEditMode(false);
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
        date: newPracticeDate.toISOString().split('T')[0],
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
  
  
  return (
    <div>
      <h2>Practice Schedule</h2> {/* Add the title here */}
      <div className="practice-list">
        {userRole === 'Captain' && (
          <>
            <button onClick={() => setAddPracticeMode(true)} className="new-prac-button">Add New Practice</button>
          </>
        )}

        {practices.map((item) => (
          <div key={item.id} className="practice-item">
            <p>{formatDate(item.date)}</p>
            <p><b>{item.day}</b> {item.time} @ {item.location}</p>
            
            {conflicts[item.id] && conflicts[item.id].length > 0 && (
              <div className="conflicts">
                <h4>Conflicts:</h4>
                {conflicts[item.id].map((conflict, index) => (
                  <p key={index}>
                    {users[conflict.dancerId]} - {conflict.conflictTime} - {conflict.reason}
                  </p>
                ))}
              </div>
            )}

            <div className="button-group">
              {userRole === 'Captain' && (
                <button onClick={() => {
                  setSelectedPractice(item);
                  setEditMode(true);
                  setNewPracticeTime(item.time);
                  setNewPracticeLocation(item.location);
                }}>
                  Edit Practice
                </button>
              )}
              
              <button onClick={() => {
                setSelectedPractice(item);
                setModalVisible(true);
              }}>
                Add Conflict
              </button>
            </div>
          </div>
        ))}
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

      {editMode && selectedPractice && (
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
            <button onClick={() => {
              setEditMode(false);
              setSelectedPractice(null);
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeList;

// API base URL
const API_BASE = '/api';

// Helper function to make API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }
  
  return response.json();
}

// Add a new supplier
export async function addSupplier(supplierData: any) {
  try {
    console.log('Adding supplier to Firestore:', supplierData);
    
    // Add a custom ID and timestamps
    const documentData = {
      ...supplierData,
      id: uuidv4(),
      createdAt: new Date() // Using Date instead of serverTimestamp for better compatibility
    };
    
    // Add the document to Firestore directly
    const supplierCollection = collection(db, SUPPLIERS_COLLECTION);
    const docRef = await addDoc(supplierCollection, documentData);
    
    console.log(`Supplier added to Firestore with ID: ${docRef.id}`);
    
    // Return the data with the id included
    return { ...documentData, firebaseId: docRef.id };
  } catch (error) {
    console.error('Error adding supplier to Firestore:', error);
    throw error;
  }
}

// Get all suppliers
export async function getSuppliers() {
  try {
    console.log('Getting all suppliers from Firestore');
    
    const supplierCollection = collection(db, SUPPLIERS_COLLECTION);
    const querySnapshot = await getDocs(supplierCollection);
    
    const suppliers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        firebaseId: doc.id,
        // Convert Firestore timestamp to JS Date if needed
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date()
      };
    });
    
    console.log(`Retrieved ${suppliers.length} suppliers from Firestore`);
    return suppliers;
  } catch (error) {
    console.error('Error getting suppliers from Firestore:', error);
    throw error;
  }
}

// Update an existing supplier
export async function updateSupplier(id: string, supplierData: any) {
  try {
    console.log(`Updating supplier in Firestore with ID: ${id}`, supplierData);
    
    // First try to find by our custom ID
    const supplierCollection = collection(db, SUPPLIERS_COLLECTION);
    const q = query(supplierCollection, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const firestoreDocId = querySnapshot.docs[0].id;
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, firestoreDocId);
      
      // Add updatedAt timestamp
      const updateData = {
        ...supplierData,
        updatedAt: new Date() // Using Date instead of serverTimestamp for better compatibility
      };
      
      await updateDoc(supplierRef, updateData);
      console.log(`Supplier with ID ${id} updated successfully in Firestore`);
      
      // Get the updated document
      const updatedDoc = await getDoc(supplierRef);
      if (updatedDoc.exists()) {
        return { 
          ...updatedDoc.data(), 
          firebaseId: firestoreDocId
        };
      }
    }
    
    console.error(`Supplier with ID ${id} not found in Firestore`);
    return null;
  } catch (error) {
    console.error(`Error updating supplier in Firestore:`, error);
    throw error;
  }
}

// Record a payment to a supplier
export async function recordSupplierPayment(id: string, amount: number, description: string) {
  try {
    console.log(`Recording payment for supplier with ID: ${id}, amount: ${amount}`);
    
    // Import transaction service to record the payment transaction
    const { addTransaction } = await import('./transaction-service');
    
    // First, get the current supplier
    const supplierCollection = collection(db, SUPPLIERS_COLLECTION);
    const q = query(supplierCollection, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const supplierDoc = querySnapshot.docs[0];
      const supplierData = supplierDoc.data();
      const firestoreDocId = supplierDoc.id;
      
      // Calculate new debt (make sure it doesn't go below zero)
      const currentDebt = supplierData.debt || 0;
      const newDebt = Math.max(0, currentDebt - amount);
      
      console.log(`Updating supplier debt from ${currentDebt} to ${newDebt}`);
      
      // Update the supplier record
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, firestoreDocId);
      await updateDoc(supplierRef, { 
        debt: newDebt,
        updatedAt: new Date()
      });
      
      // Record a transaction
      await addTransaction({
        type: 'payment',
        amount: amount,
        entityId: id,
        entityType: 'supplier',
        date: new Date(),
        description: description || `Payment to supplier: ${supplierData.name}`
      });
      
      console.log(`Payment recorded successfully for supplier ${id}`);
      
      // Return the updated supplier
      const updatedDoc = await getDoc(supplierRef);
      if (updatedDoc.exists()) {
        return { 
          ...updatedDoc.data(), 
          firebaseId: firestoreDocId
        };
      }
    } else {
      console.error(`Supplier with ID ${id} not found in Firestore`);
      throw new Error(`Supplier with ID ${id} not found`);
    }
  } catch (error) {
    console.error(`Error recording payment for supplier:`, error);
    throw error;
  }
}

// Delete a supplier
export async function deleteSupplier(id: string) {
  try {
    console.log(`Deleting supplier from Firestore with ID: ${id}`);
    
    // First try to find by our custom ID
    const supplierCollection = collection(db, SUPPLIERS_COLLECTION);
    const q = query(supplierCollection, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const firestoreDocId = querySnapshot.docs[0].id;
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, firestoreDocId);
      
      await deleteDoc(supplierRef);
      console.log(`Supplier with ID ${id} deleted successfully from Firestore`);
      return true;
    }
    
    console.error(`Supplier with ID ${id} not found in Firestore`);
    return false;
  } catch (error) {
    console.error(`Error deleting supplier from Firestore:`, error);
    throw error;
  }
}
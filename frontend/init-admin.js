import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCs7t8BDexv6jtgMx0cFOYvaSKV9MUiPuE",
  authDomain: "palliative-care-app-9d6cf.firebaseapp.com",
  projectId: "palliative-care-app-9d6cf",
  storageBucket: "palliative-care-app-9d6cf.firebasestorage.app",
  messagingSenderId: "196085240825",
  appId: "1:196085240825:web:9c2c53fa6683fc3b5ca328"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    console.log("Creating admin user...");
    const cred = await createUserWithEmailAndPassword(auth, "admin@palliative-rph.local", "admin1234");
    
    console.log("Setting admin role in Firestore...");
    await setDoc(doc(db, "users", cred.user.uid), {
      username: "admin",
      name: "ผู้ดูแลระบบ (Admin)",
      role: "admin",
      createdAt: new Date().toISOString()
    });
    
    console.log("Success! Admin user created.");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
       console.log("Admin user already exists!");
    } else {
       console.error("Error:", error);
    }
    process.exit(1);
  }
}

createAdmin();

import * as admin from 'firebase-admin'
import {config as firebaseConfig} from 'firebase-functions'

admin.initializeApp(firebaseConfig().firebase)
const database = admin.firestore()

export default database

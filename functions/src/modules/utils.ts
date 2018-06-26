export default {
    /**
     * 
     * @returns Promise that resolves an array of document data objects
     */
    async coll2Arr (collection:FirebaseFirestore.CollectionReference) : Promise<Array<Object>> {
        const snapshot = await collection.get()
        const docs = []
        snapshot.forEach(doc => {
            const data = doc.data()
            data._id = doc.id
            docs.push(data)
        })
        return docs
    }
}

export default {
    /**
     * Convenience method for sending ajax requests with twitch tokens and json body
     * 
     * @param {String} type - type of http request (GET, POST, PUT, DELETE, PATCH)
     * @param {String} endpoint - url to send ajax request to 
     * @param {Object} data - optional object to send in the request body
     */
    ajax(type:string, endpoint:string, token:string, data:object = {}) : Promise<object>{
        type = type.toUpperCase()
        return new Promise((resolve, reject) => {
            $.ajax({
                type: type,
                url: endpoint,
                headers: { 'Authorization': 'Bearer ' + token },
                data: data,
                dataType: 'json',
                success(body, type){
                    console.log(body, type)
                    resolve(body)
                },
                error(req, type){
                    const err = JSON.parse(req.responseText)
                    reject(err)
                }
            })
        })
    }
}

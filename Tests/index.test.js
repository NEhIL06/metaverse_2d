const axios2 = require("axios");
const BACKEND_SERVER = "http://localhost:3000"
const ws_url = "ws://localhost:3001"
// creating an object to debug this as the axios thorws an Error even before it could reach the expect statement axios only return and 200 responce
const axios = {
    post: async(...args) => {
        try {
            const res = await axios2.post(...args)
            return res
        } catch (e) {
            return e.response
        }
    },

    get: async(...args) => {
        try {
            const res = await axios2.get(...args)
            return res
        } catch (e) {
            return e.response
        }
    },
    put: async(...args) => {
        try {
            const res = await axios2.put(...args)
            return res
        } catch (e) {
            return e.response
        }
    },
    delete: async(...args) => {
        try {
            const res = await axios2.delete(...args)
            return res
        } catch (e) {
            return e.response
        }
    }
}

//Suite 1
describe.skip("Authentication", () => {
    test('User is able to sign up only once', async () => {
        const username = "Nehil" + Math.random(); 
        const password = "123456";
        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type: "user",
        })

        expect(response.status).toBe(200)
        const updatedResponse = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type:"user"
        })

        expect(updatedResponse.status).toBe(400);
    });

    test('Signup request fails if the username is empty', async () => {
        const username = `Nehil-${Math.random()}` 
        const password = "123456"

        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            password
        })

        expect(response.status).toBe(400)
    })

    test('Signin succeeds if the username and password are correct', async() => {
        const username = `Nehil-${Math.random()}`
        const password = "123456"   
        const role = "user"

        await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type:role
        });

        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signin`, {
            username,
            password
        });

        expect(response.status).toBe(200)
        expect(response.data.token).toBeDefined()
        
    })

    test('Signin fails if the username and password are incorrect', async() => {
        const username = `kirat-${Math.random()}`
        const password = "123456"
        const role = "user"

        await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type:role
        });

        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signin`, {
            username: "WrongUsername",
            password
        })

        expect(response.status).toBe(403)
    })
})


describe.skip('User Metadata Endpoints',() =>{

    let token = "";
    let avatarId = "";
    beforeAll(async()=>{
        const username = `Nehil-${Math.random()}`
        const password = "123456"   
        const role = "user"

        await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type:role
        });

        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signin`, {
            username,
            password
        });
        token = response.data.token

        const avatarResponce = await axios.post(`${BACKEND_SERVER}/api/v1/admin/avatar`,{
            "imageUrl" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
            "name" : "Timmy"
        },{
            headers:{
                "authorization" :  `Bearer ${token}`
            }
        });
        console.log("AvatarId: "+ avatarResponce.data.avatarId)

        avatarId = avatarResponce.data.avatarId;
    }) 
    
    test('user cant update their metadata with the wrong avatar id',async() =>{

        const res =  await axios.post(`${BACKEND_SERVER}/api/v1/user/metadata`,{
            avatarId:"12123132"
        },{
            headers:{
                "authorization": `Bearer ${token}`
            }
        });

        expect(res.status).toBe(400);
    })

    test('User can Update their Metadata with the correct AvatarId',async() => {
        const res =  await axios.post(`${BACKEND_SERVER}/api/v1/user/metadata`,{
            avatarId
        },{
            headers:{
                "authorization":`Bearer ${token}`
            }
        });

        expect(res.status).toBe(200);
    })

    test('User cannot Update their Metadata with incorrect Token ',async() => {
        const res =  await axios.post(`${BACKEND_SERVER}/api/v1/user/metadata`,{
            avatarId
        })

        expect(res.status).toBe(403);
    })
})

describe.skip('user avatar Information', () => {
    let token = ""; 
    let avatarId = "";
    let userId = "";
    beforeAll(async()=>{
        const username = "Nehil" + Math.random();
        const wrongUserName = "Nehil" + Math.random();
        const password = "123456";
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username,password,type:"admin"
        })

        userId = res.data.userId;
        const nextres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username,password
        })

        token = nextres.data.token;

        const avatarResponce = await axios.post(`${BACKEND_SERVER}/api/v1/admin/avatar`,{
            "imageUrl" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
            "name" : "Timmy"
        },{
            headers:{
                authorization :  `Bearer ${token}`
            }
        });

        avatarId = avatarResponce.data.avatarId;
    })

    test('Get other users avatar information for a user ', async() => {
        console.log("asking for user with id " + userId)
        const response = await axios.get(`${BACKEND_SERVER}/api/v1/user/metadata/bulk?ids=[${userId}]`);
        console.log("response was " + userId)
        console.log(JSON.stringify(response.data))
        expect(response.data.avatars.length).toBe(1);
        expect(response.data.avatars[0].userId).toBe(userId);
    })

    test('All the available avatars', async() => {
        const res = await axios.get(`${BACKEND_SERVER}/api/v1/avatars`,);
        expect(res.data.avatars.length).not.toBe(0)
        const avatars = res.data.avatars.find(x => x.id===avatarId)
        expect(avatars).toBeDefined();
    })
    
    
})

describe.skip('Space Information', () => {

    let userToken = "";
    let userId ;

    let adminToken = "";
    let adminId ;

    let mapId;
    let element1Id;
    let element2Id;
    
    beforeAll(async()=>{
        const username = "Nehil" + Math.random();
        const adminUserName = "Nehil" + Math.random();
        const role = "admin"
        const password = "123456";
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username:adminUserName,
            password,
            type:role
        })

        adminId = res.data.userId;

        const nextres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username: adminUserName,
            password
        })

        adminToken = nextres.data.token;

        const userRes = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username,password,type:"user"
        })

        userId = userRes.data.userId;

        const nextUserres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username,
            password
        })

        userToken = nextUserres.data.token;

        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })

        const element2 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })
        //console.log("element1 id " + element1.data.id)
        //console.log("element2 id " + element2.data.id)
        element1Id = element1.data.id;
        element2Id = element2.data.id;


        const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
                    elementId: element1Id,
                    x: 20,
                    y: 20
                }, {
                  elementId: element1Id,
                    x: 18,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 19,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 19,
                    y: 20
                }
            ]
        },{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })

        mapId = maps.id;
    })

    test('Create a Space ', async() => {
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space`,{
            name: "Test",
          dimensions: "100x100",
          mapId: mapId
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
    })

       expect(res.status).toBe(200);
       expect(res.data.spaceId).toBeDefined();
    })

    test('Create a Empty Space ', async() => {
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space`,{
            name: "Test",
          dimensions: "100x100"
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
    })

       expect(res.status).toBe(200);
       expect(res.data.spaceId).toBeDefined();
    })

    test('cannot Create a Space without mapId or dimension ', async() => {
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space`,{
            "name": "Test"
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
    })

       expect(res.status).toBe(400);
    })

    test('cannot delete a nonexistent Space ', async() => {
        const res = await axios.delete (`${BACKEND_SERVER}/api/v1/space/:spaceId`,{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
        })

       expect(res.status).toBe(400);
    })

    test('can delete a Existent Space ', async() => {

        let tempMapid;
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space`,{
            "name": "Test",
            "dimensions": "100x100",
            "mapId": mapId
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
        })

       tempMapid = res.data.spaceId;
       
        const delres = await axios.delete (`${BACKEND_SERVER}/api/v1/space/${tempMapid}`,{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
    })

       expect(delres.status).toBe(200);
    })

    test('user should not be able to delete a space created by another user ', async() => {
        let tempMapid;
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space/`,{
            "name": "Test",
            "dimensions": "100x100",
            "mapId": mapId
       },{
        headers:{
            "authorization": `Bearer ${userToken}`
        }
    })

       tempMapid = res.data.spaceId;
       
        const delres = await axios.delete(`${BACKEND_SERVER}/api/v1/space/${tempMapid}`,{
            "name": "Test",
          "dimensions": "100x100"
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }
    })

       expect(delres.status).toBe(403);
    })
    
    test('Admin has no spaces initally ', async() => {
        const response = await axios.get(`${BACKEND_SERVER}/api/v1/space/all`, 
            {
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        });
        //console.log(adminToken);;
        expect(response.data.spaces.length).toBe(2) // This has Been Changed to 2 as there are Two Spaces in the database created Prior and It is Not Deleted During the Test
    })

    test("Admin has gets once space after", async () => {
        const spaceCreateReponse = await axios.post(`${BACKEND_SERVER}/api/v1/space`, {
            "name": "Test",
            "dimensions": "100x200",
        }, {
            headers: {
                "authorization": `Bearer ${adminToken}`
            }
        });
        const response = await axios.get(`${BACKEND_SERVER}/api/v1/space/all`, {
            headers: {
                "authorization": `Bearer ${adminToken}`
            }
        });
        const filteredSpace = response.data.spaces.find(x => x.id == spaceCreateReponse.data.spaceId)
        console.log(filteredSpace)
        expect(response.data.spaces.length).toBe(3)// Hence Here We Have to Expect # instead of One As there are other Spaces in Existance
        expect(filteredSpace).toBeDefined()

    })
    
})

describe.skip('Arena Operation', () => {
    let userToken = "";
    let userId ;

    let adminToken = "";
    let adminId ;

    let mapId;
    let spaceId;
    let element1Id;
    let element2Id;
    
    beforeAll(async()=>{
        const username = "Nehil" + Math.random();
        const adminUserName = "Nehil" + Math.random();
        const password = "123456";
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username:adminUserName,
            password,
            type:"admin"   
        })

        adminId = res.data.userId;

        const nextres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username: adminUserName,            
            password
        })

        adminToken = nextres.data.token;

        const userRes = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username,password,type:"user"
        })

        userId = userRes.data.userId;

        const nextUserres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username,password
        })

        userToken = nextUserres.data.token;

        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        const element2 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        element1Id = element1.data.id;
        element2Id = element2.data.id;
        console.log("element1 id " + element1Id)    
        console.log("element2 id " + element2Id)

        const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`,{
            thumbnail: "https://thumbnail.com/a.png",
            dimensions: "100x200",
            name: "100 person interview room",
            defaultElements: [{
                    elementId: element1Id,
                    x: 20,
                    y: 20
                }, {
                  elementId: element1Id,
                    x: 18,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 12,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 19,
                    y: 20
                }
            ]
        },{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })
        mapId = maps.data.id;
        console.log("map id " + mapId)  


        const space = await axios.post(`${BACKEND_SERVER}/api/v1/space/`,{
            name: "Test",
            dimensions: "100x200",
            mapId: mapId 
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }})
        //console.log(space.data)
        spaceId = space.data.spaceId;

        //console.log("space id " + spaceId)
    })

    test('Incorrect spaceId', async() => {
        const res = await axios.get(`${BACKEND_SERVER}/api/v1/space/1241#@$`,{
            headers:{
                authorization: `Bearer ${userToken}`
            }})
        expect(res.status).toBe(400);
    })
    
    test('Correct spaceId returns all the Space Elements', async() => {
        const res = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`,{
            headers:{
                "authorization": `Bearer ${userToken}`
            }
        })

        //console.log(res.data)
        expect(res.data.dimensions).toBe("100x200");
        expect(res.data.elements.length).toBe(4);
    })
    
    test('Delete endpoints is able to delete an element', async() => {
        const res = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`,{
            headers:{
                Authorization: `Bearer ${adminToken}`
            }})
        await axios.delete(`${BACKEND_SERVER}/api/v1/space/element`,{
            spaceId : spaceId,
            elementId: res.data.elements[0].id
        },{
            headers:{
                authorization: `Bearer ${adminToken}`
            }})
        const newres = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`,{
            headers:{
                Authorization: `Bearer ${adminToken}`
            }})
        expect(newres.data.elements.length).toBe(4);
    })

    test('Adding an Element Works as Expected', async() => {
        // const res = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`)
        const elemetnSResponce = await axios.post(`${BACKEND_SERVER}/api/v1/space/element`,
            {
                spaceId: spaceId,
                elementId: element1Id,
                x: 60,
                y: 20
            },{
                headers:{
                    "authorization": `Bearer ${adminToken}`
                }}
        )
        console.log(elemetnSResponce.status)
        const newres = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`,{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }})
        console.log(newres.data);
        expect(newres.data.elements.length).toBe(5);
    })

    test('Adding an Element fails if element lies outside the Dimension', async() => {
        // const res = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`)
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/space/element`,
            {
                "elementId": element1Id,
                "spaceId": spaceId,
                "x": 1000,
                "y": 202
            },{
                headers:{
                    Authorization: `Bearer ${userToken}`
                }}
        )
        //const newres = await axios.get(`${BACKEND_SERVER}/api/v1/space/${spaceId}`)

        expect(res.status).toBe(400);
    })
})



describe('Create an Element', () => { 
    let userToken = "";
    let userId ;
    let element1Id;
    let element2Id;
    let adminToken = "";
    let adminId ;

    beforeAll(async()=>{
        const username = "Nehil" + Math.random();
        const adminUserName = "Nehil" + Math.random();
        const password = "123456";
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username:adminUserName,
            password,
            type:"admin"   
        })

        adminId = res.data.userId;

        const nextres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username: adminUserName,            
            password
        })

        adminToken = nextres.data.token;

        const userRes = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            username,password,type:"user"
        })

        userId = userRes.data.userId;

        const nextUserres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            username,password
        })

        userToken = nextUserres.data.token;

        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        const element2 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        element1Id = element1.data.id;
        element2Id = element2.data.id;
        console.log("element1 id " + element1Id)    
        console.log("element2 id " + element2Id)

        const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`,{
            thumbnail: "https://thumbnail.com/a.png",
            dimensions: "100x200",
            name: "100 person interview room",
            defaultElements: [{
                    elementId: element1Id,
                    x: 20,
                    y: 20
                }, {
                  elementId: element1Id,
                    x: 18,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 12,
                    y: 20
                }, {
                  elementId: element2Id,
                    x: 19,
                    y: 20
                }
            ]
        },{
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })
        mapId = maps.data.id;
        console.log("map id " + mapId)  


        const space = await axios.post(`${BACKEND_SERVER}/api/v1/space/`,{
            name: "Test",
            dimensions: "100x200",
            mapId: mapId 
       },{
        headers:{
            "authorization": `Bearer ${adminToken}`
        }})
        //console.log(space.data)
        spaceId = space.data.spaceId;

        //console.log("space id " + spaceId)
    })

    test('User is not able to hit admin endpoints', async() => {
        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
                "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
                "width": 1,
                "height": 1,
                "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
            },{
                headers:{
                    "authorization": `Bearer ${userToken}`
                }
        })

        expect(element1.status).toBe(403);

        const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
                            elementId: element1Id,
                            x: 20,
                            y: 20
                        }, {
                          elementId: element1Id,
                            x: 18,
                            y: 20
                        }, {
                          elementId: element2Id,
                            x: 19,
                            y: 20
                        }, {
                          elementId: element2Id,
                            x: 19,
                            y: 20
                        }
                    ]
                },{
                    headers:{
                        Authorization: `Bearer ${userToken}`
                    }
    })
        
    expect(maps.status).toBe(403);     
                
                
    const avatar = await axios.post(`${BACKEND_SERVER}/api/v1/admin/avatar`,{
        "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
        "name": "Timmy"
    },{
        headers:{
            "authorization": `Bearer ${userToken}`
        } 
    })

    

    const updateElementsResponce = await axios.put(`${BACKEND_SERVER}/api/v1/admin/element/123`,{
        "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE"	
    },{
        headers:{
            "authorization": `Bearer ${userToken}`
        }
    }
)
    expect(element1.status).toBe(403);
    expect(maps.status).toBe(403);     
    expect(avatar.status).toBe(403)
    expect(updateElementsResponce.status).toBe(403);

    })


    test('Admin is able to hit the admin endpoints space', () => {
      
    })

    test('Admin is able to update the imageUrl for and an element', async() => {

        const elementResponce = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
        },{
            headers:{
                Authorization: `Bearer ${adminToken}`
            }
    })

        const updateElementsResponce = await axios.put(`${BACKEND_SERVER}/api/v1/admin/element/${elementResponce.data.id}`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE"	
        },{
            headers:{
                Authorization: `Bearer ${adminToken}`
            }
        })


        expect(updateElementsResponce.status).toBe(200);
    })
    
})

describe.skip('Websocket Layer', () => {

    let adminToken;
    let adminId;
    let userToken;
    let userId;

    let mapId;
    let spaceId;
    let element1Id;
    let element2Id;

    let ws1;
    let ws2;
    let ws1Messages = []
    let ws2Messages = []

    let adminx;
    let adminy;
    let userx;
    let usery;

    async function setupHttpServer(){
        const username = "Nehil" + Math.random();
        const Password = "1234567"

        const adminSignUp = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            "username": username,
            "password": Password ,
            "type": "admin" // or user
        })

        const adminSignin = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            "username": username,
            "password": Password ,
        })

        adminId = adminSignUp.data.userId
        adminToken = adminSignin.data.token;

        
        const userSignUp = await axios.post(`${BACKEND_SERVER}/api/v1/signup`,{
            "username": username +"-user",
            "password": Password ,
            "type": "admin" // or user
        })

        const userSignIn = await axios.post(`${BACKEND_SERVER}/api/v1/signin`,{
            "username": username,
            "password": Password ,
        })

        userId = userSignUp.data.userId;
        userToken = userSignIn.data.token;

        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
                    "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
                    "width": 1,
                    "height": 1,
                    "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
                },{
                    headers:{
                        Authorization: `Bearer ${adminToken}`
                    }
        })
        
                const element2 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`,{
                    "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
                    "width": 1,
                    "height": 1,
                    "static": true // weather or not the user can sit on top of this element (is it considered as a collission or not)
                },{
                    headers:{
                        Authorization: `Bearer ${adminToken}`
                    }
                })
                element1Id = element1.data.id;
                element2Id = element2.data.id;
        
        
            const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`,{
                    "thumbnail": "https://thumbnail.com/a.png",
                    "dimensions": "100x200",
                    "name": "100 person interview room",
                    "defaultElements": [{
                            elementId: element1Id,
                            x: 20,
                            y: 20
                        }, {
                          elementId: element1Id,
                            x: 18,
                            y: 20
                        }, {
                          elementId: element2Id,
                            x: 19,
                            y: 20
                        }, {
                          elementId: element2Id,
                            x: 19,
                            y: 20
                        }
                    ]
                },{
                    headers:{
                        Authorization: `Bearer ${adminToken}`
                    }
            })
        
                mapId = maps.id;
        
        
            const space = await axios.post(`${BACKEND_SERVER}/api/v1/space`,{
                    "name": "Test",
                  "dimensions": "100x200",
                  "mapId": mapId
               },{
                headers:{
                    Authorization: `Bearer ${userToken}`
            }})
        
                spaceId = space.spaceId;

    }

    function waitForAndPopulateMessages(messageArray) {
        return new Promise(r=>{
            if(messageArray.length>0){
                resolve(messageArray.shift())
            } else {
                let interval = setInterval(()=>{
                    if(messageArray.length>0){
                        resolve(messageArray.shift())
                    clearInterval(interval)}
                },100)
            }
        })
    }
    async function setUpWs(){
        ws1 = new WebSocket(ws_url);
        
        
        //we are waiting for the Websocket to open and resolving the promise only when the websocket is open
        await new Promise(r=>{
            ws1.onopen = r
        })
        
        //We can Transfer only binary and String Data over websockets
        ws1.onmessage = (e) => {
            ws1Messages.push(JSON.parse(e.data));
        }
        
        ws2 = new WebSocket(ws_url);

        await new Promise(r=>{
            ws2.onopen = r
        })       

        ws2.onmessage = (e) => {
            ws2Messages.push(JSON.parse(e.data));
        }
        
    }
    beforeAll(async()=>{
        setupHttpServer();
        setUpWs();
    })

    test('Get back acknolodge of users should be  ', async() => {
        ws1.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": adminToken
            }
        }))
        
        const message1 = await waitForAndPopulateMessages(ws1Messages);

        ws2.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": userId
            }
        })) 
        
        const message2 = await waitForAndPopulateMessages(ws2Messages);
        const message3 = await waitForAndPopulateMessages(ws1Messages);

        expect(message1.type).toBe("space-joined")
        expect(message2.type).toBe("space-joined")
        expect(message3.type).toBe("user-join")
        expect(message1.payload.user.length).toBe(0);
        expect(message2.payload.user.length).toBe(1);


        expect(message3.payload.x).toBe(message2.payload.spawn.x);
        expect(message3.payload.y).toBe(message2.payload.spawn.y);

        adminx = message1.payload.spawn.x;
        adminy = message1.payload.spawn.y; 
        
        userx = message2.payload.spawn.x;
        usery = message2.payload.spawn.y;

        

    })

    test('user should not be able to move out of the map',async () => {
        ws1.send(JSON.stringify({
            type:"movement",
            payload:{
                x:101,
                y:1000
            }
        }))

        const message = await waitForAndPopulateMessages(ws1Messages);

        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminx)
        expect(message.payload.y).toBe(adminy)

    })
    
    test('user should not be able to move two blocks at the same time',async () => {
        ws1.send(JSON.stringify({
            type:"movement",
            payload:{
                x:adminx + 2,
                y:adminy
            }
        }))

        const message = await waitForAndPopulateMessages(ws1Messages);

        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminx)
        expect(message.payload.y).toBe(adminy)

    })

    test('Correct movement should be broadcasted to the other user',async () => {
        ws1.send(JSON.stringify({
            type:"movement",
            payload:{
                x:adminx+1,
                y:adminy,
                userId: adminId
            }
        }))

        const message = await waitForAndPopulateMessages(ws2Messages);

        expect(message.type).toBe("movement")
        expect(message.payload.x).toBe(adminx+1)
        expect(message.payload.y).toBe(adminy)

    })
    
    test('If a user leaves the other user recieves a user left messages',async () => {
        ws1.close();

        const message = await waitForAndPopulateMessages(ws2Messages);

        expect(message.type).toBe("user-left")
        expect(message.payload.userId).toBe(adminId)

    })
    
})

 
const axios2 = require("axios");
const BACKEND_SERVER = "http://localhost:3000"
const ws_url = "ws://localhost:8000"
const WebSocket = require('ws'); 

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
        const username = "Nehil" + Math.random() +'1'; 
        const password = "1234567";
        const response = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username,
            password,
            type: "user",
        })
        console.log("data:",response)
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
        const role = "admin"

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



describe.skip('Create an Element', () => { 
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

describe('Websocket Layer', () => {
    let adminToken, userToken, adminId, userId, mapId, element1Id, element2Id, spaceId;
    let ws1, ws2, ws1Messages = [], ws2Messages = [];
    let userX, userY, adminX, adminY;

    async function setupHTTP() {
        const username = "Nehil" + Math.random();
        const adminUserName = "Nehil" + Math.random();
        const password = "123456";
        const res = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username: adminUserName,
            password,
            type: "admin"
        });
        adminId = res.data.userId;
        
        const nextres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`, {
            username: adminUserName,
            password
        });
        adminToken = nextres.data.token;
        console.log("adminToken:", adminToken);

        const userRes = await axios.post(`${BACKEND_SERVER}/api/v1/signup`, {
            username, password, type: "user"
        });
        userId = userRes.data.userId;
        const nextUserres = await axios.post(`${BACKEND_SERVER}/api/v1/signin`, {
            username, password
        });
        userToken = nextUserres.data.token;
        console.log("userToken:", userToken);

        const element1 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`, {
            imageUrl: "https://encrypted-tbn0.gstatic.com/shopping?q...",
            width: 1,
            height: 1,
            static: true
        }, { headers: { authorization: `Bearer ${adminToken}` } });
        const element2 = await axios.post(`${BACKEND_SERVER}/api/v1/admin/element`, {
            imageUrl: "https://encrypted-tbn0.gstatic.com/shopping?q...",
            width: 1,
            height: 1,
            static: true
        }, { headers: { authorization: `Bearer ${adminToken}` } });
        element1Id = element1.data.id;
        element2Id = element2.data.id;
        console.log("element1 id:", element1Id);
        console.log("element2 id:", element2Id);

        const maps = await axios.post(`${BACKEND_SERVER}/api/v1/admin/map`, {
            thumbnail: "https://thumbnail.com/a.png",
            dimensions: "100x200",
            name: "100 person interview room",
            defaultElements: [
                { elementId: element1Id, x: 20, y: 20 },
                { elementId: element1Id, x: 18, y: 20 },
                { elementId: element2Id, x: 12, y: 20 },
                { elementId: element2Id, x: 19, y: 20 }
            ]
        }, { headers: { authorization: `Bearer ${adminToken}` } });
        mapId = maps.data.id;
        console.log("map id:", mapId);

        const space = await axios.post(`${BACKEND_SERVER}/api/v1/space/`, {
            name: "Test",
            dimensions: "100x200",
            mapId: mapId
        }, { headers: { authorization: `Bearer ${adminToken}` } });
        console.log("Space creation response:", space.data);
        spaceId = space.data.spaceId;
        console.log("Created spaceId:", spaceId);
        if (!spaceId) {
            throw new Error("Failed to create space, spaceId is undefined");
        }
    }

    function waitForAndPopLatestMessage(messageArray) {
        return new Promise(resolve => {
            if (messageArray.length > 0) {
                resolve(messageArray.shift())
            } else {
                let interval = setInterval(() => {
                    if (messageArray.length > 0) {
                        resolve(messageArray.shift())
                        clearInterval(interval)
                    }
                }, 100)
            }
        })
    }

    async function setupWs() {
        ws1 = new WebSocket(ws_url)

        ws1.onmessage = (event) => {
            console.log("got back adata 1")
            console.log(event.data)
            
            ws1Messages.push(JSON.parse(event.data))
        }
        await new Promise(r => {
          ws1.onopen = r
        })

        ws2 = new WebSocket(ws_url)

        ws2.onmessage = (event) => {
            console.log("got back data 2")
            console.log(event.data)
            ws2Messages.push(JSON.parse(event.data))
        }
        await new Promise(r => {
            ws2.onopen = r  
        })
    }
    
    beforeAll(async () => {
        await setupHTTP()
        await setupWs()
    })

    test("Get back for joining the space", async () => {
        console.log("inside first test")
        ws1.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": adminToken
            }
        }))
        console.log("insixce first test1")
        const message1 = await waitForAndPopLatestMessage(ws1Messages);
        console.log("insixce first test2")
        ws2.send(JSON.stringify({
            "type": "join",
            "payload": {
                "spaceId": spaceId,
                "token": userToken
            }
        }))
        console.log("insixce first test3")

        const message2 = await waitForAndPopLatestMessage(ws2Messages);
        const message3 = await waitForAndPopLatestMessage(ws1Messages);

        expect(message1.type).toBe("space-joined")
        expect(message2.type).toBe("space-joined")
        expect(message1.payload.users.length).toBe(0)
        expect(message2.payload.users.length).toBe(1)
        expect(message3.type).toBe("user-joined");
        expect(message3.payload.x).toBe(message2.payload.spawn.x);
        expect(message3.payload.y).toBe(message2.payload.spawn.y);
        expect(message3.payload.userId).toBe(userId);

        adminX = message1.payload.spawn.x
        adminY = message1.payload.spawn.y

        userX = message2.payload.spawn.x
        userY = message2.payload.spawn.y
    })

    test("User should not be able to move across the boundary of the wall", async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: 1000000,
                y: 10000
            }
        }));

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminX)
        expect(message.payload.y).toBe(adminY)
    })

    test("User should not be able to move two blocks at the same time", async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: adminX + 2,
                y: adminY
            }
        }));

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement-rejected")
        expect(message.payload.x).toBe(adminX)
        expect(message.payload.y).toBe(adminY)
    })

    test("Correct movement should be broadcasted to the other sockets in the room",async () => {
        ws1.send(JSON.stringify({
            type: "move",
            payload: {
                x: adminX + 1,
                y: adminY,
                userId: adminId
            }
        }));

        const message = await waitForAndPopLatestMessage(ws2Messages);
        expect(message.type).toBe("movement")
        expect(message.payload.x).toBe(adminX + 1)
        expect(message.payload.y).toBe(adminY)
    })

    test("Group chat is broadcasted to all users in the space", async () => {
        ws1.send(JSON.stringify({
            type: "groupChat",
            payload: {
                groupId: spaceId,
                message: "Hello everyone!"
            }
        }));

        const message = await waitForAndPopLatestMessage(ws2Messages);
        expect(message.type).toBe("groupChat")
        expect(message.payload.groupId).toBe(spaceId)
        expect(message.payload.message).toBe("Hello everyone!")
    })
    // test("User can send private message to other user", async () => {
    //         ws1.send(JSON.stringify({
    //             type: "privateChat",
    //             payload: {
    //                 message: "Hello there!",
    //                 userId: userId,
    //                 spaceId: spaceId
    //             }
    //         }));

    //         const message = await waitForAndPopLatestMessage(ws2Messages);
    //         expect(message.type).toBe("privateChat")
    //         expect(message.payload.message).toBe("Hello there!")
    //         expect(message.payload.userId).toBe(userId)
    //         expect(message.payload.spaceId).toBe(spaceId)
    // })

    test("If a user leaves, the other user receives a leave event", async () => {
        ws1.close()
        const message = await waitForAndPopLatestMessage(ws2Messages);
        expect(message.type).toBe("user-left")
        expect(message.payload.userId).toBe(adminId)
    })

    
});


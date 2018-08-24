#!/bin/sh
# get-user.sh winnethebro
curl -H 'Accept: application/json' -H 'Client-ID: zgjstpk3pjsc10okuwomh2o6c1pqfw' -X GET https://api.twitch.tv/helix/users?login=$1

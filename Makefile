# Default API Gateway Invocation URL
API_URL=http://localhost:9000/2015-03-31/functions/function/invocations

# Default content type for JSON requests
CONTENT_TYPE=-H "Content-Type: application/json"

.PHONY: dev logs predeploy deploy 
dev:
	@echo "🚀 Starting TypeScript Watch Mode & Docker..."
	npx tsc --watch & docker-compose up -d & while true; do inotifywait -r -e modify,create,delete ./lambda && docker-compose restart lambda; done

logs:
	@echo "📜 Fetching real-time Lambda logs..."
	docker logs -f lambda

predeploy:
	npx eslint . --fix
	npx prettier --write .

deploy:
	@echo "🚀 Deploying AWS Lambda..."
	cdk deploy --require-approval never

# Basic POST Requests
.PHONY: updateGuild initItemCollection

updateGuild:
	@curl -s -XPOST "$(API_URL)" -d '{"action":"updateGuild"}'

initItemCollection:
	@curl -s -XPOST "$(API_URL)" -d '{"action":"initItemCollection"}'

# Query Who Can Craft a Recipe
.PHONY: who profession realm
who:
	@if [ -z "$(RECIPE)" ]; then echo "❌ Error: RECIPE is required. Use: make who RECIPE='Radiant Mastery'"; exit 1; fi
	@printf '{\n'\
	'"resource": "/who/{recipe}",\n'\
	'"path": "/who/%s",\n'\
	'"httpMethod": "GET",\n'\
	'"headers": {},\n'\
	'"requestContext": {},\n'\
	'"multiValueHeaders": {},\n'\
	'"queryStringParameters": {},\n'\
	'"multiValueQueryStringParameters": {},\n'\
	'"pathParameters": {\n'\
	'  "recipe": "%s"\n'\
	'},\n'\
	'"body": null,\n'\
	'"isBase64Encoded": false\n'\
	'}\n' "$(RECIPE)" "$(RECIPE)" | tee /tmp/debug-who.json | curl -s -XPOST "$(API_URL)" $(CONTENT_TYPE) --data-binary @- | jq -r '.body | fromjson'

# profession lookup by character
profession:
	@if [ -z "$(CHARACTER)" ]; then echo "❌ Error: CHARACTER is required. Use: make profession CHARACTER=tarqwyn"; exit 1; fi
	echo "🚀 Sending JSON Payload for Character Only"; \
	printf '{\n'\
	'"resource": "/professions/{name}",\n'\
	'"path": "/professions/%s",\n'\
	'"httpMethod": "GET",\n'\
	'"headers": {},\n'\
	'"requestContext": {},\n'\
	'"multiValueHeaders": {},\n'\
	'"queryStringParameters": {},\n'\
	'"multiValueQueryStringParameters": {},\n'\
	'"pathParameters": {\n'\
	'  "name": "%s"\n'\
	'},\n'\
	'"body": null,\n'\
	'"isBase64Encoded": false\n'\
	'}\n' "$(CHARACTER)" "$(CHARACTER)" | tee /tmp/debug-profession.json; \
	cat /tmp/debug-profession.json; \
	curl -s -XPOST "$(API_URL)" $(CONTENT_TYPE) --data-binary @/tmp/debug-profession.json | jq -r 'if (.body? | length) > 0 then .body | fromjson else "❌ No data returned" end'

# profession lookup by character and realm
realm:
	@if [ -z "$(CHARACTER)" ] || [ -z "$(REALM)" ]; then echo "❌ Error: CHARACTER and REALM are required. Use: make realm CHARACTER=tarqwyn REALM=azjolnerub"; exit 1; fi
	echo "🚀 Sending JSON Payload for Character + Realm"; \
	printf '{\n'\
	'"resource": "/professions/{name}{realm}",\n'\
	'"path": "/professions/%s/%s",\n'\
	'"httpMethod": "GET",\n'\
	'"headers": {},\n'\
	'"requestContext": {},\n'\
	'"multiValueHeaders": {},\n'\
	'"queryStringParameters": {},\n'\
	'"multiValueQueryStringParameters": {},\n'\
	'"pathParameters": {\n'\
	'  "name": "%s",\n'\
	'  "realm": "%s"\n'\
	'},\n'\
	'"body": null,\n'\
	'"isBase64Encoded": false\n'\
	'}\n' "$(CHARACTER)" "$(REALM)" "$(CHARACTER)" "$(REALM)" | tee /tmp/debug-realm.json; \
	cat /tmp/debug-realm.json; \
	curl -s -XPOST "$(API_URL)" $(CONTENT_TYPE) --data-binary @/tmp/debug-realm.json | jq -r 'if (.body? | length) > 0 then .body | fromjson else "❌ No data returned" end'

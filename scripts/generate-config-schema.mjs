import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createGenerator } from 'ts-json-schema-generator'

const outputPath = resolve(process.cwd(), 'docs/schemas/game-config.schema.json')
const rootPath = resolve(process.cwd(), 'src/Core/GameConfig.ts')
const tsconfigPath = resolve(process.cwd(), 'tsconfig.json')

function main () {
  const generator = createGenerator({
    path: rootPath,
    tsconfig: tsconfigPath,
    type: 'GameConfigSchema',
    skipTypeCheck: false,
    additionalProperties: true
  })

  const schema = generator.createSchema('GameConfigSchema')
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
  process.stdout.write(`Generated ${outputPath}\n`)
}

main()

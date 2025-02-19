import { Sequelize } from 'sequelize';
import config from 'config';

import AvalonPlayerModel from '../models/AvalonPlayer';
import AvalonQuestModel from '../models/AvalonQuest';
import AvalonGameModel from '../models/AvalonGame';
import RoomModel from '../models/AvalonRoom';

const db: string = process.env.DATABASE_URL || config.get('postgresURI');
const sequelize = new Sequelize(db, {
    dialectOptions:
        process.env.NODE_ENV === 'production'
            ? {
                  ssl: {
                      rejectUnauthorized: false,
                  },
              }
            : {},
});
const queryInterface = sequelize.getQueryInterface();

const Avalon = AvalonGameModel(sequelize, Sequelize);
const AvalonRoom = RoomModel(sequelize, Sequelize);
const AvalonPlayer = AvalonPlayerModel(sequelize, Sequelize);
const AvalonQuest = AvalonQuestModel(sequelize, Sequelize);

Avalon.hasMany(AvalonRoom);
AvalonRoom.belongsTo(Avalon);

AvalonRoom.hasMany(AvalonPlayer, { foreignKey: 'roomCode' });
AvalonPlayer.belongsTo(AvalonRoom, { foreignKey: 'roomCode' });

AvalonRoom.hasMany(AvalonQuest, { foreignKey: 'roomCode' });
AvalonQuest.belongsTo(AvalonRoom, { foreignKey: 'roomCode' });

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Postgres Connected');

        await sequelize.sync({ force: true });
    } catch (err: any) {
        console.error(err.message);
        process.exit(1);
    }
};

export { connectDB, sequelize, Sequelize, queryInterface, AvalonRoom, Avalon, AvalonPlayer, AvalonQuest };

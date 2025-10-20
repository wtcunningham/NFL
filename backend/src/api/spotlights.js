import { Router } from 'express'
const router=Router({mergeParams:true})
router.get('/',async(req,res)=>{res.json({team_id:'TBD',players:[{player_id:'qb1',name:'QB Spotlight',pos:'QB',confidence:70.2,rationale:'Offense leaning pass vs favorable defense.'},{player_id:'wr1',name:'WR Spotlight',pos:'WR',confidence:66.4,rationale:'Strong role + zone advantage.'}]})})
export default router

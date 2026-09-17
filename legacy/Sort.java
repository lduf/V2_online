public class Sort{
    private String name;
    private int degat;
    private int soin;
    private int de;

    public Sort(){
	}
    public Sort(String name, int degat, int soin, int de){
        this.name= name;
        this.degat= degat;
        this.soin= soin;
        this.de= de;
    }
//Getters
    public int GetDegat(){
      return this.degat;
    }
    public int GetSoin(){
      return this.soin;
    }
    public int GetDe(){
      return this.de;
    }
    public String GetName(){
      return this.name;
    }
  //To String 
    public String toString(){
        return "Vous avez le sort "+this.name+". \n Il inflige "+this.degat+" dégats, possède "+this.soin+(" point(s) de soin et nécessite un dé de ")+this.de+"\n \n";
    }
}
